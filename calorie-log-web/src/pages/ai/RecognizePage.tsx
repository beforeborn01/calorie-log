import { useRef, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Empty,
  InputNumber,
  List,
  Select,
  Space,
  Tag,
  Typography,
  message,
} from 'antd';
import { ArrowLeftOutlined, CameraOutlined, UploadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { recognizeFood, type RecognizeResponse } from '../../api/ai';
import { createRecord } from '../../api/record';

const MEAL_OPTIONS = [
  { label: '早餐', value: 1 },
  { label: '午餐', value: 2 },
  { label: '晚餐', value: 3 },
  { label: '加餐', value: 4 },
];

const MAX_BYTES = 2 * 1024 * 1024;

export default function RecognizePage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const initialDate = params.get('date') || dayjs().format('YYYY-MM-DD');
  const initialMeal = Number(params.get('meal') ?? 1) as 1 | 2 | 3 | 4;

  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RecognizeResponse | null>(null);
  const [quantities, setQuantities] = useState<Record<string, number | null>>({});
  const [mealType, setMealType] = useState(initialMeal);

  const onPick = () => fileRef.current?.click();

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_BYTES) {
      message.error(`图片过大（${(file.size / 1024 / 1024).toFixed(1)} MB），请压缩到 2MB 以内`);
      e.target.value = '';
      return;
    }
    const base64 = await fileToBase64(file);
    setPreview(base64);
    setResult(null);
    setQuantities({});
    setLoading(true);
    try {
      const r = await recognizeFood(stripDataUri(base64));
      setResult(r);
    } catch (err: any) {
      message.error(err?.message || '识别失败');
    } finally {
      setLoading(false);
      e.target.value = '';
    }
  };

  const onAdd = async (candidateIdx: number) => {
    const c = result!.candidates[candidateIdx];
    const qty = quantities[String(candidateIdx)] ?? 100;
    if (!qty || qty <= 0) {
      message.error('请填写分量（g）');
      return;
    }
    try {
      if (c.foodId) {
        await createRecord({
          recordDate: initialDate,
          mealType,
          foodId: c.foodId,
          quantity: qty,
          addMethod: 3, // photo recognize
        });
      } else {
        await createRecord({
          recordDate: initialDate,
          mealType,
          foodName: c.name,
          quantity: qty,
          calories: 150, // 未匹配时给用户粗估，可之后在记录中调整
          addMethod: 3,
        });
      }
      message.success(`已添加「${c.name}」`);
    } catch (err: any) {
      message.error(err?.message || '添加失败');
    }
  };

  return (
    <div style={{ padding: 24, maxWidth: 820, margin: '0 auto' }}>
      <Space style={{ marginBottom: 16 }}>
        <Link to="/">
          <ArrowLeftOutlined /> 返回首页
        </Link>
        <Button icon={<CameraOutlined />} onClick={() => navigate(`/food/add?date=${initialDate}&meal=${mealType}`)}>
          改用搜索录入
        </Button>
      </Space>

      <Card
        title="拍照 / 从相册识别食物"
        extra={
          <Space>
            <span>添加到</span>
            <Select
              value={mealType}
              onChange={(v) => setMealType(v as 1 | 2 | 3 | 4)}
              options={MEAL_OPTIONS}
              style={{ width: 100 }}
            />
          </Space>
        }
      >
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          hidden
          onChange={onFile}
        />
        <Button type="primary" icon={<UploadOutlined />} onClick={onPick} loading={loading}>
          选择图片
        </Button>
        <Typography.Paragraph type="secondary" style={{ marginTop: 12, marginBottom: 0 }}>
          图片上限 2MB。{" "}
          {result?.mocked && (
            <Tag>当前为 Mock 数据（未配置百度 AI key）</Tag>
          )}
        </Typography.Paragraph>

        {preview && (
          <div style={{ marginTop: 16 }}>
            <img
              src={preview}
              alt="preview"
              style={{ maxWidth: '100%', maxHeight: 240, borderRadius: 8 }}
            />
          </div>
        )}
      </Card>

      {result && (
        <Card title={`识别结果（${result.candidates.length} 项）`} style={{ marginTop: 16 }}>
          {result.fromCache && <Alert type="info" showIcon message="来自缓存（相同图片 7 天内复用）" style={{ marginBottom: 12 }} />}
          {result.candidates.length === 0 ? (
            <Empty description="未识别到食物，请手动录入" />
          ) : (
            <List
              dataSource={result.candidates}
              renderItem={(c, idx) => (
                <List.Item
                  key={c.name}
                  actions={[
                    <InputNumber
                      key="qty"
                      min={1}
                      max={5000}
                      value={quantities[String(idx)] ?? 100}
                      onChange={(v) => setQuantities({ ...quantities, [String(idx)]: v as number | null })}
                      addonAfter="g"
                      style={{ width: 120 }}
                    />,
                    <Button key="add" type="primary" onClick={() => onAdd(idx)}>
                      添加
                    </Button>,
                  ]}
                >
                  <List.Item.Meta
                    title={
                      <Space>
                        <Typography.Text strong>{c.name}</Typography.Text>
                        <Tag color="blue">置信度 {Math.round(c.probability * 100)}%</Tag>
                        {c.foodId ? <Tag color="blue">已匹配食物库</Tag> : <Tag>需要手动录入</Tag>}
                      </Space>
                    }
                    description={
                      <Space size="small" wrap>
                        {c.category && <Typography.Text type="secondary">分类：{c.category}</Typography.Text>}
                        {c.caloriesPer100g != null && (
                          <Typography.Text type="secondary">
                            {Number(c.caloriesPer100g).toFixed(0)} kcal / 100g
                          </Typography.Text>
                        )}
                      </Space>
                    }
                  />
                </List.Item>
              )}
            />
          )}
        </Card>
      )}
    </div>
  );
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function stripDataUri(s: string): string {
  const i = s.indexOf(',');
  return s.startsWith('data:') && i >= 0 ? s.slice(i + 1) : s;
}

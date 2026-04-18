import { useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Checkbox,
  Empty,
  Input,
  List,
  Space,
  Tag,
  Typography,
  message,
} from 'antd';
import { ArrowLeftOutlined, HeartFilled, HeartOutlined, SearchOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import {
  addFavorite,
  getCookingSuggestions,
  type CookingMethod,
  type CookingSuggestionResponse,
} from '../../api/ai';

const GOAL_LABEL: Record<string, string> = { bulk: '增肌', cut: '减脂', general: '均衡' };
const TAG_LABEL: Record<string, string> = { quick: '快手', low_oil: '低油', no_smoke: '无油烟' };

export default function CookingPage() {
  const [foodName, setFoodName] = useState('');
  const [prefs, setPrefs] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<CookingSuggestionResponse | null>(null);
  const [savedNames, setSavedNames] = useState<Set<string>>(new Set());

  const onSubmit = async () => {
    if (!foodName.trim()) return;
    setLoading(true);
    try {
      const r = await getCookingSuggestions(foodName.trim(), prefs.join(','));
      setData(r);
      setSavedNames(new Set());
    } catch (e: any) {
      message.error(e?.message || '获取推荐失败');
    } finally {
      setLoading(false);
    }
  };

  const onSave = async (m: CookingMethod) => {
    if (!data) return;
    try {
      await addFavorite(data.foodName, m);
      message.success(`已收藏「${m.name}」`);
      setSavedNames(new Set([...savedNames, m.name]));
    } catch (e: any) {
      message.error(e?.message || '收藏失败');
    }
  };

  return (
    <div className="page-container" style={{ maxWidth: 820 }}>
      <Space style={{ marginBottom: 16 }} wrap>
        <Link to="/">
          <ArrowLeftOutlined /> 返回首页
        </Link>
        <Link to="/favorites">
          <Button icon={<HeartOutlined />}>我的收藏</Button>
        </Link>
      </Space>

      <Card title="烹饪方法推荐">
        <Space.Compact style={{ width: '100%' }}>
          <Input
            placeholder="食材名称，如 鸡胸肉 / 三文鱼 / 西兰花"
            value={foodName}
            onChange={(e) => setFoodName(e.target.value)}
            onPressEnter={onSubmit}
            maxLength={50}
          />
          <Button type="primary" icon={<SearchOutlined />} loading={loading} onClick={onSubmit}>
            生成推荐
          </Button>
        </Space.Compact>
        <Checkbox.Group
          options={[
            { label: '快手', value: 'quick' },
            { label: '低油', value: 'low_oil' },
            { label: '无油烟', value: 'no_smoke' },
          ]}
          value={prefs}
          onChange={(v) => setPrefs(v as string[])}
          style={{ marginTop: 12 }}
        />
      </Card>

      {data && (
        <Card
          title={
            <Space>
              <span>推荐结果</span>
              <Tag color="blue">适配目标：{GOAL_LABEL[data.goalType] ?? data.goalType}</Tag>
              {data.fromCache && <Tag>缓存</Tag>}
              {!data.llmGenerated && <Tag>静态兜底</Tag>}
            </Space>
          }
          style={{ marginTop: 16 }}
        >
          {data.methods.length === 0 ? (
            <Empty description="暂无建议，换个食材或调整偏好" />
          ) : (
            <List
              dataSource={data.methods}
              renderItem={(m) => (
                <List.Item
                  key={m.name}
                  actions={[
                    savedNames.has(m.name) ? (
                      <Button key="saved" icon={<HeartFilled />} disabled>
                        已收藏
                      </Button>
                    ) : (
                      <Button key="save" icon={<HeartOutlined />} onClick={() => onSave(m)}>
                        收藏
                      </Button>
                    ),
                  ]}
                >
                  <List.Item.Meta
                    title={
                      <Space wrap>
                        <Typography.Text strong>{m.name}</Typography.Text>
                        {m.fitGoals.map((g) => (
                          <Tag key={g} color="blue">
                            {GOAL_LABEL[g] ?? g}
                          </Tag>
                        ))}
                        {m.tags.map((t) => (
                          <Tag key={t}>{TAG_LABEL[t] ?? t}</Tag>
                        ))}
                      </Space>
                    }
                    description={
                      <Space direction="vertical" size={4} style={{ width: '100%' }}>
                        <Typography.Text type="secondary">{m.advantages}</Typography.Text>
                        <Space size="small" wrap>
                          <Tag>约 {Number(m.caloriesPer100g).toFixed(0)} kcal/100g</Tag>
                          <Tag>用油 {Number(m.oilPerServingG).toFixed(1)} g</Tag>
                          <Tag>{m.durationMinutes} 分钟</Tag>
                        </Space>
                        <ol style={{ paddingLeft: 20, marginBottom: 0 }}>
                          {m.steps.map((s, i) => (
                            <li key={i}>{s}</li>
                          ))}
                        </ol>
                      </Space>
                    }
                  />
                </List.Item>
              )}
            />
          )}
        </Card>
      )}

      {!data && (
        <Alert
          style={{ marginTop: 16 }}
          type="info"
          showIcon
          message="说明"
          description="推荐会结合你当前的健身目标（增肌/减脂/均衡）给出差异化建议。开发环境使用静态兜底数据；生产环境会走 LLM (豆包) 生成。"
        />
      )}
    </div>
  );
}

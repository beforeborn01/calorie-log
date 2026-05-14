// 自然语言补录训练（调 /training/sessions/quick-log）
//
// 用户写："今天硬拉 100kg 5x5、卧推 60kg 4x8"
// 后端：解析 → 模糊匹配动作（含 LLM 兜底）→ 新建 completed session
import { useState } from 'react';
import { App, Button, Input, Modal, Tag, Typography } from 'antd';
import dayjs from 'dayjs';
import { quickLog, type QuickLogResponse } from '../../api/training';

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess?: (resp: QuickLogResponse) => void;
}

const EXAMPLES = [
  '今天硬拉 100kg 5x5、卧推 60kg 4x8',
  '昨天 引体向上 5组×10、深蹲 80kg 4x6',
  '今天慢跑 30 分钟',
];

export default function QuickLogModal({ open, onClose, onSuccess }: Props) {
  const { message } = App.useApp();
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<QuickLogResponse | null>(null);

  async function submit() {
    if (!text.trim()) {
      message.warning('请输入要补录的训练内容');
      return;
    }
    setLoading(true);
    try {
      const resp = await quickLog(text, dayjs().toISOString());
      setResult(resp);
      onSuccess?.(resp);
    } catch (e) {
      message.error((e as Error).message || '补录失败');
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setText('');
    setResult(null);
  }

  return (
    <Modal
      title="自然语言补录训练"
      open={open}
      onCancel={() => {
        reset();
        onClose();
      }}
      width={640}
      footer={
        result ? (
          <Button
            type="primary"
            onClick={() => {
              reset();
              onClose();
            }}
          >
            完成
          </Button>
        ) : (
          <>
            <Button onClick={onClose}>取消</Button>
            <Button type="primary" loading={loading} onClick={submit}>
              解析并保存
            </Button>
          </>
        )
      }
      destroyOnClose
    >
      {!result ? (
        <>
          <Typography.Paragraph type="secondary" style={{ marginBottom: 8 }}>
            把你脑子里记的训练写下来，系统会自动解析并新建一次"已完成"的训练记录。
            支持中文动作名、重量 (kg)、组×次 / 多组组合。
          </Typography.Paragraph>
          <Input.TextArea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={EXAMPLES[0]}
            rows={5}
            autoFocus
            allowClear
          />
          <div style={{ marginTop: 12 }}>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              示例：
            </Typography.Text>
            <div style={{ marginTop: 4, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {EXAMPLES.map((e) => (
                <Tag
                  key={e}
                  style={{ cursor: 'pointer' }}
                  onClick={() => setText(e)}
                >
                  {e}
                </Tag>
              ))}
            </div>
          </div>
        </>
      ) : (
        <div>
          <Typography.Title level={5} style={{ marginTop: 0 }}>
            ✅ 已补录：{result.session.name}
          </Typography.Title>
          <div style={{ marginBottom: 8, color: '#666' }}>
            {(result.session.exercises || []).length} 个动作，
            {(result.session.exercises || []).reduce((s, ex) => s + ex.completedSets.length, 0)} 组
          </div>

          {result.newExercises.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <Typography.Text strong>新建动作：</Typography.Text>
              <div style={{ marginTop: 4 }}>
                {result.newExercises.map((e) => (
                  <Tag key={e.id} color="green" style={{ marginBottom: 4 }}>
                    {e.name} · {e.bodyPart}
                  </Tag>
                ))}
              </div>
            </div>
          )}

          {result.notes.length > 0 && (
            <div>
              <Typography.Text strong>说明：</Typography.Text>
              <ul style={{ marginTop: 4, paddingLeft: 20 }}>
                {result.notes.map((n, i) => (
                  <li key={i} style={{ color: '#666' }}>
                    {n}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

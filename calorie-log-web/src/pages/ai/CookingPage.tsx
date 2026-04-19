import { useState } from 'react';
import {
  Alert,
  Checkbox,
  Input,
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
import { Chip, PaperCard, SketchButton } from '../../components/sketch';

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
    <div style={{ maxWidth: 820, margin: '0 auto', padding: 24 }}>
      <div style={{ marginBottom: 8 }}>
        <Link className="hand accent" to="/">
          <ArrowLeftOutlined /> 返回首页
        </Link>
      </div>
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          marginBottom: 16,
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div>
          <div className="mono ink-soft" style={{ fontSize: 11, letterSpacing: 2 }}>COOKING · 烹饪</div>
          <h1 className="display" style={{ fontSize: 36, margin: '4px 0 0' }}>
            <span className="scribble-u">烹饪推荐</span>
          </h1>
        </div>
        <Link to="/favorites">
          <SketchButton>
            <HeartOutlined style={{ marginRight: 4 }} />我的收藏
          </SketchButton>
        </Link>
      </div>

      <PaperCard style={{ marginBottom: 16 }}>
        <h3 className="display" style={{ fontSize: 22, margin: '0 0 12px' }}>输入食材</h3>
        <div style={{ display: 'flex', gap: 8 }}>
          <Input
            placeholder="食材名称，如 鸡胸肉 / 三文鱼 / 西兰花"
            value={foodName}
            onChange={(e) => setFoodName(e.target.value)}
            onPressEnter={onSubmit}
            maxLength={50}
            style={{ flex: 1 }}
          />
          <SketchButton primary onClick={onSubmit} disabled={loading} style={{ whiteSpace: 'nowrap', flex: '0 0 auto' }}>
            <SearchOutlined style={{ marginRight: 4 }} />{loading ? '生成中…' : '生成推荐'}
          </SketchButton>
        </div>
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
      </PaperCard>

      {data && (
        <PaperCard>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 16 }}>
            <h3 className="display" style={{ fontSize: 22, margin: 0 }}>推荐结果</h3>
            <Chip color="var(--accent-soft)">适配目标：{GOAL_LABEL[data.goalType] ?? data.goalType}</Chip>
            {data.fromCache && <Chip color="var(--paper-2)">缓存</Chip>}
            {!data.llmGenerated && <Chip color="var(--paper-2)">静态兜底</Chip>}
          </div>

          {data.methods.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <div className="display" style={{ fontSize: 36, color: 'var(--ink-faint)' }}>暂无</div>
              <div className="hand ink-soft" style={{ marginTop: 6 }}>换个食材或调整偏好试试</div>
            </div>
          ) : (
            <div>
              {data.methods.map((m) => (
                <div
                  key={m.name}
                  style={{
                    padding: '14px 0',
                    borderTop: '1px dashed rgba(0,0,0,0.1)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: 200 }}>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 6 }}>
                        <span className="hand" style={{ fontWeight: 700, fontSize: 16 }}>{m.name}</span>
                        {m.fitGoals.map((g) => (
                          <Chip key={g} color="var(--accent-soft)">{GOAL_LABEL[g] ?? g}</Chip>
                        ))}
                        {m.tags.map((t) => (
                          <Chip key={t} color="var(--paper-2)">{TAG_LABEL[t] ?? t}</Chip>
                        ))}
                      </div>
                      <div className="hand ink-soft" style={{ fontSize: 14 }}>{m.advantages}</div>
                      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 8 }}>
                        <span className="mono ink-soft" style={{ fontSize: 12 }}>
                          约 {Number(m.caloriesPer100g).toFixed(0)} kcal/100g
                        </span>
                        <span className="mono ink-soft" style={{ fontSize: 12 }}>
                          用油 {Number(m.oilPerServingG).toFixed(1)} g
                        </span>
                        <span className="mono ink-soft" style={{ fontSize: 12 }}>
                          {m.durationMinutes} 分钟
                        </span>
                      </div>
                      <ol className="hand" style={{ paddingLeft: 20, marginTop: 10, marginBottom: 0, fontSize: 14 }}>
                        {m.steps.map((s, i) => (
                          <li key={i} style={{ marginBottom: 4 }}>{s}</li>
                        ))}
                      </ol>
                    </div>
                    <div>
                      {savedNames.has(m.name) ? (
                        <SketchButton size="sm" disabled>
                          <HeartFilled style={{ marginRight: 4, color: 'var(--accent)' }} />已收藏
                        </SketchButton>
                      ) : (
                        <SketchButton size="sm" onClick={() => onSave(m)}>
                          <HeartOutlined style={{ marginRight: 4 }} />收藏
                        </SketchButton>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </PaperCard>
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

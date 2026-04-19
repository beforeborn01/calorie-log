import { useEffect, useState } from 'react';
import { Popconfirm, message } from 'antd';
import { ArrowLeftOutlined, DeleteOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { deleteFavorite, listFavorites, type CookingFavorite, type CookingMethod } from '../../api/ai';
import { Chip, PaperCard, SketchButton } from '../../components/sketch';

const TAG_LABEL: Record<string, string> = { quick: '快手', low_oil: '低油', no_smoke: '无油烟' };
const GOAL_LABEL: Record<string, string> = { bulk: '增肌', cut: '减脂', general: '均衡' };

export default function FavoritesPage() {
  const [list, setList] = useState<CookingFavorite[]>([]);
  const [loading, setLoading] = useState(false);

  const reload = async () => {
    setLoading(true);
    try {
      setList(await listFavorites());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reload();
  }, []);

  const onDelete = async (id: number) => {
    await deleteFavorite(id);
    message.success('已删除');
    reload();
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
          <div className="mono ink-soft" style={{ fontSize: 11, letterSpacing: 2 }}>FAVORITES · 收藏</div>
          <h1 className="display" style={{ fontSize: 36, margin: '4px 0 0' }}>
            <span className="scribble-u">烹饪收藏</span>
          </h1>
        </div>
        <Link to="/cooking">
          <SketchButton>去搜索推荐</SketchButton>
        </Link>
      </div>

      {loading && list.length === 0 ? (
        <PaperCard><div className="hand ink-faint" style={{ padding: '12px 0' }}>加载中…</div></PaperCard>
      ) : list.length === 0 ? (
        <PaperCard>
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <div className="display" style={{ fontSize: 36, color: 'var(--ink-faint)' }}>暂无</div>
            <div className="hand ink-soft" style={{ marginTop: 6 }}>还没有收藏任何烹饪方法</div>
            <Link to="/cooking">
              <SketchButton primary style={{ marginTop: 16 }}>去搜索推荐</SketchButton>
            </Link>
          </div>
        </PaperCard>
      ) : (
        list.map((f) => {
          let m: CookingMethod | null = null;
          try {
            m = JSON.parse(f.content);
          } catch {
            m = null;
          }
          return (
            <PaperCard key={f.id} style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 8 }}>
                    <span className="hand" style={{ fontWeight: 700, fontSize: 16 }}>{f.cookingMethod}</span>
                    <span className="hand ink-soft" style={{ fontSize: 14 }}>· {f.foodName}</span>
                    {m?.fitGoals?.map((g) => (
                      <Chip key={g} color="var(--accent-soft)">{GOAL_LABEL[g] ?? g}</Chip>
                    ))}
                    {m?.tags?.map((t) => (
                      <Chip key={t} color="var(--paper-2)">{TAG_LABEL[t] ?? t}</Chip>
                    ))}
                  </div>
                  {m ? (
                    <>
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
                    </>
                  ) : (
                    <div className="hand ink-soft">（内容解析失败）</div>
                  )}
                </div>
                <Popconfirm title="取消收藏？" onConfirm={() => onDelete(f.id)}>
                  <SketchButton size="sm" aria-label="删除">
                    <DeleteOutlined />
                  </SketchButton>
                </Popconfirm>
              </div>
            </PaperCard>
          );
        })
      )}
    </div>
  );
}

import { useEffect, useState } from 'react';
import { Button, Card, Empty, List, Popconfirm, Space, Tag, Typography, message } from 'antd';
import { ArrowLeftOutlined, DeleteOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { deleteFavorite, listFavorites, type CookingFavorite, type CookingMethod } from '../../api/ai';

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
    <div className="page-container" style={{ maxWidth: 820 }}>
      <Space style={{ marginBottom: 16 }} wrap>
        <Link to="/">
          <ArrowLeftOutlined /> 返回首页
        </Link>
        <Link to="/cooking">
          <Button>去搜索推荐</Button>
        </Link>
      </Space>
      <Card title="我的烹饪收藏" loading={loading}>
        {list.length === 0 ? (
          <Empty description="还没有收藏任何烹饪方法" />
        ) : (
          <List
            dataSource={list}
            renderItem={(f) => {
              let m: CookingMethod | null = null;
              try {
                m = JSON.parse(f.content);
              } catch {
                m = null;
              }
              return (
                <List.Item
                  key={f.id}
                  actions={[
                    <Popconfirm
                      key="del"
                      title="取消收藏？"
                      onConfirm={() => onDelete(f.id)}
                    >
                      <Button danger icon={<DeleteOutlined />} />
                    </Popconfirm>,
                  ]}
                >
                  <List.Item.Meta
                    title={
                      <Space wrap>
                        <Typography.Text strong>
                          {f.cookingMethod} <Typography.Text type="secondary">· {f.foodName}</Typography.Text>
                        </Typography.Text>
                        {m?.fitGoals?.map((g) => (
                          <Tag key={g} color="blue">
                            {GOAL_LABEL[g] ?? g}
                          </Tag>
                        ))}
                        {m?.tags?.map((t) => (
                          <Tag key={t}>{TAG_LABEL[t] ?? t}</Tag>
                        ))}
                      </Space>
                    }
                    description={
                      m ? (
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
                      ) : (
                        <Typography.Text type="secondary">（内容解析失败）</Typography.Text>
                      )
                    }
                  />
                </List.Item>
              );
            }}
          />
        )}
      </Card>
    </div>
  );
}

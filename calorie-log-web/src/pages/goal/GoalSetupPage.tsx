import { useEffect, useState } from 'react';
import { Alert, Button, Card, Checkbox, Descriptions, Form, InputNumber, Radio, Segmented, Space, Spin, message } from 'antd';
import { useNavigate } from 'react-router-dom';
import { getCurrentGoal, getTrainingSchedule, saveTrainingSchedule, setGoal, type Goal } from '../../api/goal';

const WEEKDAYS = [
  { label: '一', value: 1 }, { label: '二', value: 2 }, { label: '三', value: 3 },
  { label: '四', value: 4 }, { label: '五', value: 5 }, { label: '六', value: 6 }, { label: '日', value: 7 },
];

export default function GoalSetupPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [goal, setGoalState] = useState<Goal | null>(null);
  const [goalType, setGoalType] = useState<1 | 2>(1);
  const [weekdays, setWeekdays] = useState<number[]>([1, 3, 5]);
  const [intensity, setIntensity] = useState<1 | 2 | 3>(2);

  useEffect(() => {
    Promise.allSettled([getCurrentGoal(), getTrainingSchedule()])
      .then(([gRes, sRes]) => {
        if (gRes.status === 'fulfilled') {
          setGoalState(gRes.value);
          setGoalType(gRes.value.goalType);
        }
        if (sRes.status === 'fulfilled') {
          setWeekdays(sRes.value.trainingWeekdays ?? []);
          setIntensity((sRes.value.defaultIntensity || 2) as 1 | 2 | 3);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (values: {
    targetCaloriesTraining?: number;
    targetCaloriesRest?: number;
    proteinRatio?: number;
    carbRatio?: number;
    fatRatio?: number;
  }) => {
    setSaving(true);
    try {
      const updated = await setGoal({ goalType, ...values });
      await saveTrainingSchedule({ trainingWeekdays: weekdays, defaultIntensity: intensity });
      setGoalState(updated);
      message.success('目标已保存');
      navigate('/', { replace: true });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Spin style={{ display: 'block', margin: '80px auto' }} />;

  return (
    <div style={{ padding: 24, maxWidth: 720, margin: '0 auto' }}>
      <Card title="设置健身目标">
        <div style={{ marginBottom: 16 }}>
          <Segmented
            value={goalType}
            onChange={(v) => setGoalType(v as 1 | 2)}
            options={[
              { label: '增肌塑型', value: 1 },
              { label: '减脂增肌', value: 2 },
            ]}
            block
          />
        </div>

        {goal && (
          <Alert
            style={{ marginBottom: 16 }}
            type="info"
            showIcon
            message="当前系统计算"
            description={
              <Descriptions size="small" column={2}>
                <Descriptions.Item label="BMR">{Number(goal.bmr).toFixed(0)} kcal</Descriptions.Item>
                <Descriptions.Item label="基础 TDEE">{Number(goal.tdeeBase).toFixed(0)} kcal</Descriptions.Item>
                <Descriptions.Item label="训练日目标">{Number(goal.targetCaloriesTraining).toFixed(0)} kcal</Descriptions.Item>
                <Descriptions.Item label="休息日目标">{Number(goal.targetCaloriesRest).toFixed(0)} kcal</Descriptions.Item>
                <Descriptions.Item label="蛋白/碳水/脂肪">
                  {goal.proteinRatio}% / {goal.carbRatio}% / {goal.fatRatio}%
                </Descriptions.Item>
              </Descriptions>
            }
          />
        )}

        <Form
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={
            goal
              ? {
                  targetCaloriesTraining: Number(goal.targetCaloriesTraining),
                  targetCaloriesRest: Number(goal.targetCaloriesRest),
                  proteinRatio: Number(goal.proteinRatio),
                  carbRatio: Number(goal.carbRatio),
                  fatRatio: Number(goal.fatRatio),
                }
              : {}
          }
        >
          <Form.Item label="训练日目标热量 (kcal, 可微调)" name="targetCaloriesTraining">
            <InputNumber style={{ width: '100%' }} min={800} max={5000} />
          </Form.Item>
          <Form.Item label="休息日目标热量 (kcal, 可微调)" name="targetCaloriesRest">
            <InputNumber style={{ width: '100%' }} min={800} max={5000} />
          </Form.Item>
          <Space>
            <Form.Item label="蛋白%" name="proteinRatio">
              <InputNumber min={10} max={60} />
            </Form.Item>
            <Form.Item label="碳水%" name="carbRatio">
              <InputNumber min={20} max={70} />
            </Form.Item>
            <Form.Item label="脂肪%" name="fatRatio">
              <InputNumber min={15} max={50} />
            </Form.Item>
          </Space>
          <Form.Item label="每周哪些天训练">
            <Checkbox.Group
              value={weekdays}
              onChange={(v) => setWeekdays(v as number[])}
              options={WEEKDAYS}
            />
          </Form.Item>
          <Form.Item label="默认训练强度">
            <Radio.Group value={intensity} onChange={(e) => setIntensity(e.target.value)}>
              <Radio value={1}>低</Radio>
              <Radio value={2}>中</Radio>
              <Radio value={3}>高</Radio>
            </Radio.Group>
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={saving} block>
            保存目标
          </Button>
        </Form>
      </Card>
    </div>
  );
}

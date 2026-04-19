import { useEffect, useState } from 'react';
import { Avatar, message } from 'antd';
import { Link, useNavigate } from 'react-router-dom';
import { apiGet } from '../../api/client';
import { logout } from '../../api/auth';
import { getExperience, getExpLogs, type ExpLog, type Experience } from '../../api/social';
import { useAuthStore } from '../../store/auth';
import type { UserProfile } from '../../types';
import { Chip, PaperCard, ScribbleBar, SketchButton } from '../../components/sketch';

const GENDER_MAP: Record<number, string> = { 0: '未设置', 1: '男', 2: '女' };
const ACTIVITY_MAP: Record<number, string> = { 1: '极少', 2: '轻度', 3: '中度', 4: '高强度' };

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        padding: '10px 0',
        borderBottom: '1px dashed rgba(0,0,0,0.1)',
      }}
    >
      <span className="hand ink-soft" style={{ fontSize: 14 }}>{label}</span>
      <span className="hand" style={{ fontSize: 15, fontWeight: 700 }}>{value ?? '-'}</span>
    </div>
  );
}

export default function ProfilePage() {
  const navigate = useNavigate();
  const [profile, setLocalProfile] = useState<UserProfile | null>(null);
  const [experience, setExperience] = useState<Experience | null>(null);
  const [logs, setLogs] = useState<ExpLog[]>([]);
  const setProfile = useAuthStore((s) => s.setProfile);
  const doLogout = useAuthStore((s) => s.logout);

  useEffect(() => {
    apiGet<UserProfile>('/users/profile').then((p) => {
      setLocalProfile(p);
      setProfile(p);
    });
    getExperience().then(setExperience).catch(() => undefined);
    getExpLogs(10).then(setLogs).catch(() => undefined);
  }, [setProfile]);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (_) {
      /* ignore */
    }
    doLogout();
    message.success('已登出');
    navigate('/login', { replace: true });
  };

  if (!profile) return null;
  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 8 }}>
        <div>
          <div className="mono ink-soft" style={{ fontSize: 11, letterSpacing: 2 }}>PROFILE · 档案</div>
          <h1 className="display" style={{ fontSize: 40, margin: '4px 0 0' }}>
            <span className="scribble-u">个人中心</span>
          </h1>
        </div>
        <SketchButton size="sm" onClick={handleLogout}>退出登录</SketchButton>
      </div>
      <div className="hand ink-soft" style={{ marginBottom: 24 }}>你的档案与成长轨迹</div>

      <PaperCard style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
          <Avatar size={64} src={profile.avatarUrl || undefined} style={{ background: 'var(--accent)' }}>
            {profile.nickname?.slice(0, 1) || '用'}
          </Avatar>
          <div>
            <div className="display" style={{ fontSize: 24 }}>{profile.nickname}</div>
            <div className="hand ink-soft" style={{ fontSize: 13 }}>{profile.phone || profile.email}</div>
          </div>
        </div>
        <Row label="性别" value={GENDER_MAP[profile.gender ?? 0]} />
        <Row label="年龄" value={profile.age ?? '-'} />
        <Row label="身高" value={profile.height ? <span className="mono">{profile.height} cm</span> : '-'} />
        <Row label="体重" value={profile.weight ? <span className="mono">{profile.weight} kg</span> : '-'} />
        <Row label="活动量" value={profile.activityLevel ? ACTIVITY_MAP[profile.activityLevel] : '-'} />
        <Row label="时区" value={<span className="mono">{profile.timezone}</span>} />
        <Row label="微信绑定" value={profile.wechatBound ? '已绑定' : '未绑定'} />
        <div style={{ marginTop: 20, display: 'flex', gap: 12 }}>
          <Link to="/profile/setup">
            <SketchButton primary>修改个人信息</SketchButton>
          </Link>
          <Link to="/">
            <SketchButton>返回首页</SketchButton>
          </Link>
        </div>
      </PaperCard>

      {experience && (
        <PaperCard>
          <h3 className="display" style={{ fontSize: 22, margin: '0 0 16px' }}>成长体系</h3>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginBottom: 12 }}>
            <Chip color="var(--accent-soft)">Lv {experience.level}</Chip>
            <span className="hand">累计 <span className="mono">{experience.totalExp}</span> exp</span>
            <span className="hand ink-soft">距下一级 <span className="mono">{experience.expToNextLevel}</span> exp</span>
            <span className="hand ink-soft">连续 <span className="mono">{experience.continuousDays}</span> 天</span>
          </div>
          <ScribbleBar pct={Number(experience.levelProgress)} />

          <h4 className="display" style={{ fontSize: 18, margin: '20px 0 8px' }}>最近 10 条经验</h4>
          {logs.length === 0 ? (
            <div className="hand ink-faint" style={{ padding: '12px 0' }}>暂无经验变化</div>
          ) : (
            <div>
              {logs.map((l, idx) => (
                <div
                  key={`${l.createdAt}-${idx}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '8px 0',
                    borderBottom: '1px dashed rgba(0,0,0,0.08)',
                  }}
                >
                  <Chip color={l.expChange >= 0 ? 'var(--accent-soft)' : 'var(--paper-3)'}>
                    {l.expChange >= 0 ? '+' : ''}{l.expChange} exp
                  </Chip>
                  <span className="hand" style={{ flex: 1 }}>{l.reasonDetail ?? l.reasonCode}</span>
                  <span className="mono ink-faint" style={{ fontSize: 12 }}>
                    {l.createdAt.slice(0, 16).replace('T', ' ')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </PaperCard>
      )}
    </div>
  );
}

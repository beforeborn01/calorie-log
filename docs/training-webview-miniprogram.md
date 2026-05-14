# 训练页在小程序 web-view 里的体验要点

`calorie-log-miniprogram` 是 web-view 套壳，整个 React web 直接跑在小程序里。
对饮食记录这种"看 > 改 > 提交"场景影响很小；但训练页是密集交互，几个坑要提前知道。

## 已知问题 / 工程要点

### 1. 计时器在后台被微信冻结
微信小程序后台后，web-view 内的 `setInterval` 会被节流甚至停。
**对策**：休息计时器已经改用 **绝对时间戳 `endAt`**（存 localStorage），
切回前台时立刻按 `Date.now()` 校准剩余。这一项已经做好，不需要额外处理。

### 2. 声音提示可能放不出来
微信 web-view 的 `AudioContext` 默认被锁定，必须用户手势后才能 resume。
**对策**：第一次"开始训练"按钮点击时，可以主动 `new AudioContext().resume()` 暖一下；
或者用 `wx.miniProgram.postMessage` 让壳里调 `wx.vibrateShort()` 替代。
当前实现：失败静默（catch 吞掉），用户不会看到错误，只是没声音。

### 3. 触摸滚动 vs InputNumber 步进按钮
- 训练页 ActiveWorkoutPage 大量 `InputNumber`（reps/weight/rpe）
- 微信里点 `+`/`−` 容易触发整页滚动
**对策**：在按钮上加 `touch-action: manipulation`；或者把 InputNumber 换成大号 Stepper。
**未做**：现在依赖 AntD 默认 + iOS Safari 行为，体感够用，等用户反馈再优化。

### 4. 数字键盘弹起遮挡输入框
iOS 微信里输入数字时键盘会从下面弹起来，遮挡当前编辑行。
**对策**：用 `scrollIntoView({block: 'center'})`，或在 focus 时设置 `padding-bottom`。
**未做**：和 #3 一起放到反馈后再优化。

### 5. 物理返回键 → 退出 web-view 而非返回上一页
微信 web-view 的安卓返回键直接关 web-view，不走 React Router。
**对策**：在训练进行中（`status=in_progress`）拦截 `wx.miniProgram.postMessage({type: 'guard-exit'})`，
壳里弹"放弃训练吗？"。
**未做**：训练页 onUnload / beforeunload 监听容易冲突，先观察用户行为再加。

### 6. 长按文本被选中
微信里长按 web-view 文本会弹"复制"，可能干扰组完成的双击逻辑。
**对策**：训练页根容器加 `user-select: none`，输入框单独 `user-select: text`。
**未做**：当前训练页没有"长按"或"双击"自定义手势，所以暂不影响。

## 实际验证 checklist

备案下来上线后，在 iPhone 和安卓微信里都按以下流程跑一遍：

- [ ] 训练计划 → 开始训练 → 进入 ActiveWorkout 页
- [ ] 勾选第一组 → 听到蜂鸣 + 看到组间休息倒计时
- [ ] 切到微信首页（home），等 90 秒再回来 → 倒计时正确（不是冻结也不是跳到 0）
- [ ] 在第二组 InputNumber 改重量 → 数字键盘弹起，看是否遮挡
- [ ] 点 InputNumber 的 + → 是否误触整页滚动
- [ ] 点"结束训练" → 弹完成 Modal 显示 PR
- [ ] 点 OK → 跳到训练历史页

记录有问题的项，按上面对策修。

## 不要做的事

- ❌ 在训练页用 `<canvas>` 自绘倒计时 —— web-view 里 canvas 性能不稳定，可能掉帧
- ❌ 在训练页用大段 `motion`/`transition` —— 微信 web-view 的 transform 偶尔会渲染错位
- ❌ 直接 `window.location.reload()` —— 会触发 web-view 整体重载，进度可能丢

## 后续可能的方案

如果发现训练流程在小程序里转化率明显低于纯 web：
1. 加 onLoad/onUnload 持久化（已经做了 endAt 时间戳）
2. 给训练页做**原生小程序页**（脱离 web-view），与饮食页共用账号即可
3. 或者把训练流程降级为"输入式补录"（QuickLog Modal 已就绪），减少交互

让数据说话，不要提前 over-engineer。

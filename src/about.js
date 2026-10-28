export const FEEDBACK_TEMPLATE='掌间交互 2.3 体验反馈\n体验地址：https://zhangjian-jiaohu.pages.dev/\n\n设备与浏览器：\n\n遇到的问题：\n\n复现步骤：\n1. \n2. \n\n期待的效果：\n\n请不要附上私人照片、摄像头画面或账号信息。';

export function aboutMarkup(){
  const feedback=new URL('https://github.com/qiangua337/zhangjian-jiaohu/issues/new');
  feedback.searchParams.set('title','掌间交互体验反馈（2.3）');
  feedback.searchParams.set('body',FEEDBACK_TEMPLATE);
  return `<dialog id="about-dialog" class="dialog about-dialog" aria-labelledby="about-title">
    <button class="dialog-close" type="button" aria-label="关闭作品介绍">×</button>
    <p class="dialog-eyebrow">掌间交互 · 公开体验版 2.3</p><h2 id="about-title">让每一次挥手，<br>都有回应。</h2>
    <p class="dialog-description">这是一件可以用触屏、鼠标和双手参与的三维互动作品。探索五个光影世界，选择喜欢的形态，也可以加入自己的照片。</p>
    <section class="about-section"><h3>先玩，再决定是否开启手势</h3><p>无需注册，也无需摄像头就能探索全部作品。可以先用示例相册试试效果，再选择自己的照片。</p><button id="about-guide" class="secondary-button" type="button">查看使用说明</button></section>
    <section class="about-section"><h3>照片与摄像头，只在你的设备中处理</h3><p>手势识别、摄像头画面和照片处理均在浏览器内完成，你的照片不会上传到服务器。刷新页面会清空本次照片。</p><p>保存的图片可能包含你的照片；分享的体验链接只保留作品与聚散状态，不包含照片。</p></section>
    <section class="about-section"><h3>设备与浏览器</h3><p>建议使用新版系统浏览器。手机可直接触屏探索；应用内浏览器若无法开启手势，可改用系统浏览器，或继续用触屏体验。复杂场景会根据设备调整画质。</p></section>
    <section class="about-section"><h3>一起把作品完善</h3><p>欢迎使用、修改和分享原创代码。项目采用 MIT 许可证，第三方资源保留各自许可。</p><div class="about-links"><a class="secondary-button" href="https://github.com/qiangua337/zhangjian-jiaohu" target="_blank" rel="noopener noreferrer">查看开源代码</a><a class="primary-button" href="${feedback.href}" target="_blank" rel="noopener noreferrer">在 GitHub 反馈问题</a><button id="copy-feedback" class="secondary-button" type="button">复制反馈模板</button></div><p id="feedback-status" role="status" aria-live="polite"></p><textarea id="feedback-template" class="feedback-template" aria-label="反馈模板" readonly hidden></textarea><small>不使用 GitHub，也可复制模板，填写后自行发给邀请你的人。GitHub 反馈会公开显示，请勿附上私人照片或账号信息。</small></section>
  </dialog>`;
}

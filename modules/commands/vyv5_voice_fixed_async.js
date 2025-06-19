const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

module.exports.config = {
  name: "tiktok",
  version: "1.5.0",
  hasPermssion: 0,
  credits: "ChatGPT",
  description: "Tìm kiếm và tải video TikTok",
  commandCategory: "Tiện ích",
  usages: "tiktok <từ khóa>",
  cooldowns: 5
};

module.exports.run = async ({ api, event, args }) => {
  const keyword = args.join(" ");
  const { threadID, messageID, senderID } = event;

  if (!keyword) return api.sendMessage("🔎 Nhập từ khóa để tìm video TikTok!", threadID, messageID);

  try {
    const res = await axios.get(`https://www.tikwm.com/api/feed/search?keywords=${encodeURIComponent(keyword)}`);
    const videos = res.data.data?.slice(0, 5);

    if (!videos?.length) return api.sendMessage("❌ Không tìm thấy video nào.", threadID, messageID);

    let msg = `📝 Có ${videos.length} kết quả trùng với từ khóa “${keyword}”:\n──────────────────\n`;
    const attachments = [];

    for (let i = 0; i < videos.length; i++) {
      const v = videos[i];
      msg += `|› ${i + 1}. ${v.title || "Không có tiêu đề"}\n`;
      msg += `|› 👤 Kênh: ${v.author?.unique_id || "Không rõ"}\n`;
      msg += `|› 👁️ ${v.play_count?.toLocaleString() || "?"} | ❤️ ${v.digg_count?.toLocaleString() || "?"}\n`;
      msg += `|› ⏱️ ${formatDuration(v.duration)}\n`;
      msg += `──────────────────\n`;

      // Lấy ảnh thumbnail
      const thumbStream = await axios.get(v.cover, { responseType: "stream" }).then(res => res.data);
      attachments.push(thumbStream);
    }

    msg += `\n📌 Reply (phản hồi) số từ 1-${videos.length} để tải video.`

    api.sendMessage({
      body: msg.trim(),
      attachment: attachments
    }, threadID, (err, info) => {
      if (err) return;
      global.client.handleReply.push({
        name: module.exports.config.name,
        messageID: info.messageID,
        author: senderID,
        videos
      });
    }, messageID);

  } catch (err) {
    console.error(err);
    api.sendMessage("❌ Đã xảy ra lỗi khi tìm kiếm TikTok.", threadID, messageID);
  }
};

module.exports.handleReply = async ({ api, event, handleReply }) => {
  const { threadID, messageID, senderID, body } = event;
  if (senderID !== handleReply.author) return;

  const index = parseInt(body);
  if (isNaN(index) || index < 1 || index > handleReply.videos.length)
    return api.sendMessage("⚠️ Số không hợp lệ.", threadID, messageID);

  const video = handleReply.videos[index - 1];
  api.unsendMessage(handleReply.messageID);
  api.setMessageReaction("⏳", messageID, () => {}, true);

  const downloadUrl = video.play || video.playwm;
  const filePath = path.join(__dirname, "cache", `${Date.now()}.mp4`);

  try {
    const res = await axios({
      url: downloadUrl,
      method: "GET",
      responseType: "stream"
    });

    const writer = fs.createWriteStream(filePath);
    res.data.pipe(writer);

    writer.on("finish", () => {
      api.sendMessage({
        body: `🎬 ${video.title || "Video đã chọn"}`,
        attachment: fs.createReadStream(filePath)
      }, threadID, () => {
        fs.unlinkSync(filePath);
        api.setMessageReaction("✅", messageID, () => {}, true);
      });
    });

    writer.on("error", () => {
      api.sendMessage("❌ Lỗi khi tải video.", threadID);
      api.setMessageReaction("❌", messageID, () => {}, true);
    });

    setTimeout(() => {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }, 60000);

  } catch (err) {
    console.error(err);
    api.sendMessage("❌ Không thể tải video.", threadID, messageID);
    api.setMessageReaction("❌", messageID, () => {}, true);
  }
};

function formatDuration(sec) {
  if (!sec || isNaN(sec)) return "Không rõ";
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
  }

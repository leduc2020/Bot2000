const ytSearch = require("yt-search");
const ytdl = require("@distube/ytdl-core");
const axios = require("axios");
const fs = require("fs");
const path = require("path");

module.exports.config = {
  name: "ytb",
  version: "1.0.0",
  hasPermssion: 0,
  credits: "qt", // tôn trọng qt với, code mấy ngày đó
  description: "Tìm kiếm và tải video YouTube",
  commandCategory: "Tiện ích",
  usages: "ytb <từ khóa>",
  cooldowns: 5
};

module.exports.run = async ({ api, event, args }) => {
  const search = args.join(" ");
  const { threadID, messageID, senderID } = event;

  if (!search) return api.sendMessage("🔎 Nhập từ khóa để tìm video!", threadID, messageID);

  try {
    const result = await ytSearch(search);
    const videos = result.videos.slice(0, 6);
    if (!videos.length) return api.sendMessage("❌ Không tìm thấy video nào.", threadID, messageID);

    let msg = "🎬 Kết quả tìm kiếm:\n\n";
    videos.forEach((video, index) => {
      msg += `${index + 1}. ${video.title} (${video.timestamp})\n👁 ${video.views} views\n\n`;
    });
    msg += "📌 Reply số tương ứng để tải video.";

    const attachments = await Promise.all(
      videos.map(video => axios.get(video.thumbnail, { responseType: "stream" }).then(res => res.data))
    );

    api.sendMessage({
      body: msg,
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
    return api.sendMessage("❌ Lỗi khi tìm kiếm video.", threadID, messageID);
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

  try {
    const info = await ytdl.getInfo(video.url);
    const videoFormats = info.formats.filter(f => f.hasAudio && f.hasVideo && f.container === 'mp4');
    let bestFormat = videoFormats.find(f => f.qualityLabel === '720p');
    if (!bestFormat) {
      bestFormat = videoFormats.sort((a, b) => (b.height || 0) - (a.height || 0))[0];
    }

    if (!bestFormat) {
      api.setMessageReaction("❌", messageID, () => {}, true);
      return api.sendMessage("❌ Không tìm thấy định dạng video phù hợp.", threadID, messageID);
    }

    const filePath = path.join(__dirname, "cache", `${Date.now()}.mp4`);
    const stream = ytdl(video.url, { format: bestFormat });
    const writeStream = fs.createWriteStream(filePath);

    stream.pipe(writeStream);

    writeStream.on("finish", () => {
      api.sendMessage({
        body: `🎥 ${video.title} (${bestFormat.qualityLabel})`,
        attachment: fs.createReadStream(filePath)
      }, threadID, () => {
        fs.unlinkSync(filePath);
        api.setMessageReaction("✅", event.messageID, () => {}, true);
      });
    });

  } catch {
    api.setMessageReaction("❌", event.messageID, () => {}, true);
    api.sendMessage("❌ Không thể tải video.", threadID, messageID);
  }
};
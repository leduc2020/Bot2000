const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

module.exports.config = {
  name: "tt",
  version: "1.3.0",
  hasPermssion: 0,
  credits: "Trâm Anh",
  description: "Tìm video TikTok và chọn video từ danh sách",
  commandCategory: "Tiện ích",
  usages: "[từ khóa]",
  cooldowns: 5
};

module.exports.run = async function({ api, event, args }) {
  const keyword = args.join(" ");
  if (!keyword) return api.sendMessage("❌ Nhập từ khóa cần tìm.", event.threadID, event.messageID);

  try {
    const res = await axios.get(`https://www.tikwm.com/api/feed/search?keywords=${encodeURIComponent(keyword)}`);
    const videos = res.data.data;

    if (!videos || videos.length === 0)
      return api.sendMessage("❌ Không tìm thấy video nào.", event.threadID, event.messageID);

    const limit = Math.min(videos.length, 5);
    let list = `📄 Danh sách video TikTok với từ khóa: "${keyword}":\n\n`;

    for (let i = 0; i < limit; i++) {
      const v = videos[i];
      list += `${i + 1}. ${v.title || "Không có tiêu đề"}\n👉 https://www.tiktok.com/@${v.author.unique_id}/video/${v.id}\n\n`;
    }

    // Gửi danh sách + lưu dữ liệu handleReply
    api.sendMessage(list.trim() + "\n💬 Reply với số (1-5) để tải video bạn chọn.", event.threadID, (err, info) => {
      global.client.handleReply.push({
        name: module.exports.config.name,
        messageID: info.messageID,
        author: event.senderID,
        videos: videos.slice(0, limit)
      });
    });
  } catch (e) {
    console.error(e);
    return api.sendMessage("❌ Đã có lỗi xảy ra khi xử lý.", event.threadID, event.messageID);
  }
};

module.exports.handleReply = async function({ api, event, handleReply }) {
  const { author, videos } = handleReply;
  if (event.senderID !== author)
    return api.sendMessage("⚠️ Bạn không phải người đã yêu cầu danh sách này.", event.threadID);

  const choice = parseInt(event.body);
  if (isNaN(choice) || choice < 1 || choice > videos.length)
    return api.sendMessage(`⚠️ Chỉ được chọn số từ 1 đến ${videos.length}.`, event.threadID);

  const video = videos[choice - 1];
  const downloadUrl = video.play || video.playwm;
  const fileName = `tiktok_${Date.now()}.mp4`;
  const filePath = path.join(__dirname, "cache", fileName);

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
        body: `🎬 Đây là video bạn chọn:\n${video.title || "Không có tiêu đề"}`,
        attachment: fs.createReadStream(filePath)
      }, event.threadID, () => fs.unlinkSync(filePath), event.messageID);
    });

    writer.on("error", (e) => {
      console.error(e);
      api.sendMessage("❌ Lỗi khi tải video.", event.threadID);
    });

    // Phòng trường hợp lỗi không xoá
    setTimeout(() => {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }, 60 * 1000);

  } catch (e) {
    console.error(e);
    return api.sendMessage("❌ Không thể tải video.", event.threadID);
  }
};

const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

module.exports.config = {
  name: "tt",
  version: "1.4.0",
  hasPermssion: 0,
  credits: "Trâm Anh",// thay cre làm chó
  description: "Tìm và tải video TikTok bằng cách chọn từ danh sách",
  commandCategory: "Tiện ích",
  usages: "[từ khóa]",
  cooldowns: 5
};

module.exports.run = async function ({ api, event, args }) {
  const keyword = args.join(" ");
  if (!keyword) return api.sendMessage("❌ Nhập từ khóa cần tìm.", event.threadID, event.messageID);

  try {
    const res = await axios.get(`https://www.tikwm.com/api/feed/search?keywords=${encodeURIComponent(keyword)}`);
    const videos = res.data.data;

    if (!videos || videos.length === 0)
      return api.sendMessage("❌ Không tìm thấy video nào phù hợp.", event.threadID, event.messageID);

    const limit = Math.min(videos.length, 5);
    let list = `📝 Có ${limit} kết quả trùng với từ khóa: “${keyword}”\n──────────────────\n`;

    for (let i = 0; i < limit; i++) {
      const v = videos[i];
      const title = v.title || "Không có tiêu đề";
      const author = v.author?.unique_id || v.author?.nickname || "Không rõ";
      const views = v.play_count ? v.play_count.toLocaleString() : "Không rõ";
      const likes = v.digg_count ? v.digg_count.toLocaleString() : "Không rõ";
      const duration = v.duration ? convertDuration(v.duration) : "Không rõ";

      list += `|› ${i + 1}. ${title}\n`;
      list += `|› 👤 Kênh: ${author}\n`;
      list += `|› 👁️ Lượt xem: ${views} | ❤️ Thích: ${likes}\n`;
      list += `|› ⏱️ Thời lượng: ${duration}\n`;
      list += `──────────────────\n`;
    }

    list += `\n📌 Reply (phản hồi) số từ 1-${limit} để tải video bạn chọn.`;

    api.sendMessage(list, event.threadID, (err, info) => {
      global.client.handleReply.push({
        name: module.exports.config.name,
        messageID: info.messageID,
        author: event.senderID,
        videos: videos.slice(0, limit)
      });
    });
  } catch (e) {
    console.error(e);
    api.sendMessage("❌ Đã xảy ra lỗi khi tìm kiếm video.", event.threadID, event.messageID);
  }
};

module.exports.handleReply = async function ({ api, event, handleReply }) {
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
    const response = await axios({
      url: downloadUrl,
      method: "GET",
      responseType: "stream"
    });

    const writer = fs.createWriteStream(filePath);
    response.data.pipe(writer);

    writer.on("finish", () => {
      api.sendMessage({
        body: `🎬 Đây là video bạn chọn:\n📌 ${video.title || "Không có tiêu đề"}`,
        attachment: fs.createReadStream(filePath)
      }, event.threadID, () => fs.unlinkSync(filePath), event.messageID);
    });

    writer.on("error", (err) => {
      console.error(err);
      api.sendMessage("❌ Lỗi khi tải video.", event.threadID);
    });

    setTimeout(() => {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }, 60 * 1000);

  } catch (e) {
    console.error(e);
    api.sendMessage("❌ Không thể tải video.", event.threadID);
  }
};

function convertDuration(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
                             }

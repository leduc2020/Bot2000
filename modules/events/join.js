const path = require('path');
const fs = require('fs')
const thuebotDataPath = path.join(__dirname, './../commands/data', 'thuebot.json');
let data = fs.existsSync(thuebotDataPath) ? require(thuebotDataPath) : [];

module.exports.config = {
    name: "joinNoti",
    eventType: ["log:subscribe"],
    version: "1.0.5",
    credits: "Mirai Team & Modified by Satoru",
    description: "Thông báo bot hoặc người vào nhóm có random gif/ảnh/video",
    dependencies: {
        "fs-extra": "",
        "path": "",
        "pidusage": ""
    }
};

module.exports.run = async function({ api, event, Users, Threads }) {
    const { threadID, logMessageData, author } = event;
    const { join } = global.nodemodule["path"];
    const { PREFIX } = global.config;
    const thread = global.data.threadData.get(threadID) || {};
    if (typeof thread["joinNoti"] != "undefined" && thread["joinNoti"] == false) return;

    if (logMessageData.addedParticipants.some(i => i.userFbId == api.getCurrentUserID())) {
        const rentalData = data.find(rental => rental.t_id === threadID);
        let newNickname = rentalData ? `${rentalData.time_end}` : "Chưa thuê bot";
        let threadSetting = global.data.threadData.get(threadID) || {};
        let prefix = threadSetting.PREFIX || PREFIX;
        api.changeNickname(`[ ${prefix} ] • ${(!global.config.BOTNAME) ? "Made by Satoru" : global.config.BOTNAME} | HSD: ${newNickname}`, threadID, api.getCurrentUserID());
        const fs = require("fs");
        var mlg = "🌐 Kết Nối Thành Công!\n🎊 Hãy bắt đầu dùng những lệnh dưới đây để làm quen!\n─────────────────\n👉 /menu (xem danh sách toàn bộ lệnh)\n👉/check (kiểm tra tin nhắn)\n👉/setname để đặt biệt danh\n👉/anti bật bảo vệ nhóm.\n─────────────────\n💥 dùng lệnh chậm thôi nhé.\n Liên hệ facebook Admin bên dưới để được duyệt bot !";
        api.shareContact(mlg, 61568443432899, threadID);
    } else {
        try {
            let thread_data = await Threads.getData(threadID);
            if (thread_data && thread_data.data.auto_set_nickname) {
               let asnn = thread_data.data.auto_set_nickname;
                if (asnn && asnn.all) {
                    let time_join = require("moment-timezone")().tz("Asia/Ho_Chi_Minh").format("DD/MM/YYYY - HH:mm:ss");
                    for (let { fullName, firstName, userFbId: id } of event.logMessageData.addedParticipants) {
                        try {
                            let name_set = asnn.all.replace(/\${full_name}/g, fullName).replace(/\${short_name}/g, firstName).replace(/\${time_join}/g, time_join);
                            await new Promise(resolve => api.changeNickname(name_set, threadID, id, (err, res) => resolve()));
                        } catch (e) {
                            console.error("Error setting nickname:", e);
                        }
                    }
                    api.sendMessage(`Đã set biệt danh cho thành viên mới`, threadID);
                }
            }
            
            const { threadName, participantIDs } = await api.getThreadInfo(threadID);
            const moment = require("moment-timezone");
            const time = moment.tz("Asia/Ho_Chi_Minh").format("HH:mm:ss - DD/MM/YYYY");
            const hours = moment.tz("Asia/Ho_Chi_Minh").format("HH");
            var thu = moment.tz('Asia/Ho_Chi_Minh').format('dddd');
            if (thu == 'Sunday') thu = 'Chủ Nhật'
            if (thu == 'Monday') thu = 'Thứ Hai'
            if (thu == 'Tuesday') thu = 'Thứ Ba'
            if (thu == 'Wednesday') thu = 'Thứ Tư'
            if (thu == "Thursday") thu = 'Thứ Năm'
            if (thu == 'Friday') thu = 'Thứ Sáu'
            if (thu == 'Saturday') thu = 'Thứ Bảy'


            var mentions = [], nameArray = [], memLength = [], iduser = [];
            
            for (let participant of logMessageData.addedParticipants) {
                const userName = participant.fullName;
                iduser.push(participant.userFbId.toString());
                nameArray.push(userName);
                mentions.push({ tag: userName, id: participant.userFbId });
                memLength.push(participantIDs.length - iduser.length + 1);
            }
            memLength.sort((a, b) => a - b);

            // Kiểm tra xem có shortcut join không
            const shortcutData = global.moduleData.shortcut.get(threadID) || [];
            const joinShortcut = shortcutData.find(e => e.input_type === 'join');

            let msg, attachment;
            if (joinShortcut) {
                msg = joinShortcut.output;
                // Lấy attachment từ shortcut nếu có
                if (joinShortcut.uri) {
                    if (/^https:\/\//.test(joinShortcut.uri)) {
                        attachment = await global.utils.getStreamFromURL(joinShortcut.uri);
                    } else if (joinShortcut.uri === 'girl') {
                        attachment = global.girl.splice(0, 1);
                    } else if (joinShortcut.uri === 'boy') {
                        attachment = global.boy.splice(0, 1);
                    }
                }
            } else {
                msg = (typeof thread_data.data.customJoin == "undefined") 
                    ? "‎🎊 Chào mừng {name} đến với {threadName}\n─────────────────\n👤 {type} là thành viên thứ {soThanhVien} của nhóm\n🎀 {type} được thêm bởi: {author} vào {time} - ( buổi {session} {thu} )"
                    : thread_data.data.customJoin;
                try {
                    attachment = global.a.splice(0,1);
                } catch (e) {
                    console.error("Error getting default attachment:", e);
                    attachment = null;
                }
            }

            var getData = await Users.getData(author);
            var nameAuthor = getData.name || "Người dùng tự vào";

            msg = msg
                .replace(/\{iduser}/g, iduser.join(', '))
                .replace(/\{name}/g, nameArray.join(', '))
                .replace(/\{type}/g, (memLength.length > 1) ? 'Các bạn' : 'Bạn')
                .replace(/\{soThanhVien}/g, memLength.join(', '))
                .replace(/\{author}/g, nameAuthor)
                .replace(/\{authorId}/g, author)
                .replace(/\{threadName}/g, threadName)
                .replace(/\{thu}/g, thu)
                .replace(/\{session}/g, hours <= 10 ? "sáng" : 
                    hours > 10 && hours <= 12 ? "trưa" :
                    hours > 12 && hours <= 18 ? "chiều" : "tối")
                .replace(/\{time}/g, time);

            // Chuẩn bị dữ liệu tin nhắn
            const messageData = {
                body: msg,
                attachment: attachment,
                mentions: mentions
            };

            // Lưu dữ liệu tin nhắn vào global để shortcut handler có thể sử dụng
            if (!global.shortcutData) global.shortcutData = {};
            if (!global.shortcutData[threadID]) global.shortcutData[threadID] = {};
            global.shortcutData[threadID].joinMessage = messageData;

            // Nếu không có shortcut, gửi tin nhắn như bình thường
            if (!joinShortcut) {
                return api.sendMessage(messageData, threadID);
            } else {
                console.log(`Shortcut join found for thread ${threadID}. Message prepared for shortcut handler.`);
            }
        } catch (e) { 
            console.error("Error in joinNoti:", e);
        }
    }
}

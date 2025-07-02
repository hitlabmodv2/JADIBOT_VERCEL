
const axios = require('axios');
const fs = require('fs');
const path = require('path');

function loadConfig() {
    try {
        const configPath = path.join(process.cwd(), 'config.json');
        if (fs.existsSync(configPath)) {
            const configData = fs.readFileSync(configPath, 'utf8');
            return JSON.parse(configData);
        }
    } catch (error) {
        // Silent error
    }
    return {
        bot: { mode: 'public', prefix: '.', owner: '', botNumber: '' }
    };
}

function checkAccess(senderNumber, config, fromMe = false) {
    const botMode = config?.bot?.mode || 'public';

    // Mode public: semua orang bisa akses
    if (botMode === 'public') {
        return true;
    }

    // Mode self: hanya fromMe, bot number, dan owner yang bisa akses
    const botNumber = config?.bot?.botNumber;
    const ownerNumber = config?.bot?.owner;

    const cleanSender = senderNumber?.split('@')[0]?.split(':')[0];
    const cleanBot = botNumber?.split('@')[0]?.split(':')[0];
    const cleanOwner = ownerNumber?.split('@')[0]?.split(':')[0];

    const isBotNumber = cleanSender === cleanBot;
    const isOwnerNumber = cleanSender === cleanOwner;
    const isFromMe = fromMe === true;

    return isFromMe || isBotNumber || isOwnerNumber;
}

async function ReplyRynzz(teks, msg, sock) {
    const packname = "Facebook Downloader";
    const senderName = msg.pushName || (msg.key.participant || msg.key.remoteJid).split('@')[0];
    const formattedDate = new Date().toLocaleDateString('id-ID');

    let profilePic;
    try {
        const userJid = msg.key.participant || msg.key.remoteJid;
        profilePic = await sock.profilePictureUrl(userJid, 'image');
    } catch (error) {
        profilePic = "https://files.catbox.moe/mxohav.gif";
    }

    const content = {
        text: teks,
        contextInfo: {
            forwardingScore: 999,
            isForwarded: true,
            forwardedNewsletterMessageInfo: {
                newsletterName: packname,
                newsletterJid: "120363312297133690@newsletter",
            },
            externalAdReply: {
                showAdAttribution: true,
                title: `📱 ${senderName}`,
                body: `Facebook Downloader • ${formattedDate}`,
                previewType: "IMAGE",
                thumbnailUrl: profilePic || "https://files.catbox.moe/mxohav.gif",
                sourceUrl: "https://wa.me/6289688206739",
                mediaType: 1,
                renderLargerThumbnail: false
            },
        },
    };

    return await sock.sendMessage(msg.key.remoteJid, content, { quoted: msg });
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function isValidFacebookUrl(url) {
    const fbRegex = /^https?:\/\/(www\.)?(facebook\.com|fb\.watch|m\.facebook\.com)/i;
    return fbRegex.test(url);
}

async function handleFbCommand(client, m) {
    try {
        const config = loadConfig();
        const prefix = config?.bot?.prefix || '.';

        // Get message text
        const messageText = m.message?.conversation || 
                          m.message?.extendedTextMessage?.text || '';

        if (!messageText) return;

        // Check if it's fb command
        const args = messageText.slice(prefix.length).trim().split(' ');
        const command = args[0].toLowerCase();

        if (command !== 'fb') return;

        // Check access based on bot mode FIRST before processing
        const senderJid = m.key.participant || m.key.remoteJid;
        const fromMe = m.key.fromMe;

        if (!checkAccess(senderJid, config, fromMe)) {
            // In self mode, bot should not respond to unauthorized users
            return; // Silent exit, no response
        }

        // Check if URL provided
        if (args.length < 2) {
            const helpText = `
╭━━━『 📱 FACEBOOK DOWNLOADER 』━━━❀
┃ 
┃ 📝 *Cara penggunaan:*
┃ 
┃ ${prefix}fb <link facebook>
┃ 
┃ 🎯 *Contoh penggunaan:*
┃ • ${prefix}fb https://www.facebook.com/watch?v=123456789
┃ • ${prefix}fb https://fb.watch/abcdefgh
┃ • ${prefix}fb https://m.facebook.com/story.php?story_fbid=...
┃ 
┃ 📋 *Fitur:*
┃ • Download video HD/SD dari Facebook
┃ • Download audio only dari video Facebook
┃ • Support semua format link Facebook
┃ • Kualitas terbaik otomatis dipilih
┃ • Thumbnail preview included
┃ 
┃ 📱 *Format yang didukung:*
┃ • facebook.com/watch
┃ • fb.watch
┃ • m.facebook.com
┃ • facebook.com/story.php
┃ 
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━❀

_Kirim link Facebook untuk download video!_`;

            await ReplyRynzz(helpText, m, client);
            return;
        }

        // Get Facebook URL
        const fbUrl = args.slice(1).join(' ');

        // Validate Facebook URL
        if (!isValidFacebookUrl(fbUrl)) {
            await ReplyRynzz("❌ Link Facebook tidak valid! Pastikan link berasal dari Facebook.", m, client);
            return;
        }

        // Send processing message
        await ReplyRynzz("⏳ Sedang memproses video Facebook...", m, client);

        try {
            let results = [];
            let apiUsed = "NekoRinn";

            try {
                // Try NekoRinn API first
                const response = await axios.get(`https://api.nekorinn.my.id/downloader/facebook?url=${encodeURIComponent(fbUrl)}`, {
                    timeout: 30000
                });

                if (response.data && response.data.status && response.data.result) {
                    results = response.data.result;
                    apiUsed = "NekoRinn";
                } else {
                    throw new Error("NekoRinn API failed");
                }
            } catch (nekoError) {
                // Fallback to SiputzX API
                try {
                    await ReplyRynzz("⚠️ API utama bermasalah, mencoba API alternatif...", m, client);
                    
                    const fallbackResponse = await axios.get(`https://api.siputzx.my.id/api/d/facebook?url=${encodeURIComponent(fbUrl)}`, {
                        timeout: 30000,
                        headers: {
                            'accept': '*/*'
                        }
                    });

                    if (fallbackResponse.data && fallbackResponse.data.status && fallbackResponse.data.data) {
                        // Convert SiputzX format to NekoRinn format
                        results = fallbackResponse.data.data.map(item => ({
                            extension: 'mp4',
                            quality: item.resolution || 'HD',
                            size: 'Unknown',
                            url: item.url
                        }));
                        apiUsed = "SiputzX";
                    } else {
                        throw new Error("SiputzX API also failed");
                    }
                } catch (fallbackError) {
                    await ReplyRynzz("❌ Semua API Facebook downloader gagal. Silakan coba lagi nanti.", m, client);
                    return;
                }
            }

            if (!Array.isArray(results) || results.length === 0) {
                await ReplyRynzz("❌ Video Facebook tidak ditemukan atau tidak dapat diunduh!", m, client);
                return;
            }

            // Find HD video, SD video, and audio
            const hdVideo = results.find(item => item.quality === 'HD' && item.extension === 'mp4');
            const sdVideo = results.find(item => item.quality === 'SD' && item.extension === 'mp4');
            const audioOnly = results.find(item => item.quality === 'Audio');

            // Choose best video quality (HD first, then SD)
            const bestVideo = hdVideo || sdVideo;

            if (!bestVideo) {
                await ReplyRynzz("❌ Tidak dapat menemukan video dengan kualitas yang dapat diunduh!", m, client);
                return;
            }

            // Send video info
            const videoInfo = `
╭━━━『 📱 VIDEO FACEBOOK DITEMUKAN 』━━━❀
┃ 
┃ 🎥 *Kualitas:* ${bestVideo.quality}
┃ 📱 *Format:* ${bestVideo.extension.toUpperCase()}
┃ 💾 *Size:* ${bestVideo.size}
┃ 🔗 *Link:* ${fbUrl}
┃ 🌐 *API Source:* ${apiUsed}
┃ 
┃ 📥 *Status:* Sedang mengunduh video...
┃ ⏳ *Progress:* Memproses dari server...
┃ 
┃ 💡 *Info tambahan:*
┃ • Video akan dikirim otomatis
┃ • Kualitas terbaik yang tersedia
┃ • Format MP4 compatible
┃ • Menggunakan API backup jika diperlukan
┃ 
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━❀

_Mohon tunggu, sedang memproses video..._`;

            await ReplyRynzz(videoInfo, m, client);

            // Download video
            const videoResponse = await axios.get(bestVideo.url, {
                responseType: 'arraybuffer',
                timeout: 60000
            });

            if (!videoResponse.data) {
                await ReplyRynzz("❌ Gagal mengunduh video dari server Facebook!", m, client);
                return;
            }

            // Convert to buffer
            const videoBuffer = Buffer.from(videoResponse.data);

            if (videoBuffer.length === 0) {
                await ReplyRynzz("❌ File video kosong atau corrupt!", m, client);
                return;
            }

            // Send video
            await client.sendMessage(m.key.remoteJid, {
                video: videoBuffer,
                mimetype: 'video/mp4',
                fileName: `facebook_video_${Date.now()}.mp4`,
                caption: `📱 *Facebook Video Downloaded*\n🎥 Quality: ${bestVideo.quality}\n💾 Size: ${bestVideo.size}`,
                contextInfo: {
                    externalAdReply: {
                        title: "Facebook Video Downloader",
                        body: `Quality: ${bestVideo.quality} • Size: ${bestVideo.size}`,
                        thumbnailUrl: "https://files.catbox.moe/mxohav.gif",
                        mediaType: 1,
                        mediaUrl: fbUrl,
                        sourceUrl: fbUrl
                    }
                }
            }, { quoted: m });

            // Send success message
            const successText = `
╭━━━『 ✅ VIDEO BERHASIL DIKIRIM 』━━━❀
┃ 
┃ 🎥 *Kualitas:* ${bestVideo.quality}
┃ 📱 *Format:* ${bestVideo.extension.toUpperCase()}
┃ 💾 *Size:* ${bestVideo.size}
┃ 📊 *Buffer Size:* ${formatFileSize(videoBuffer.length)}
┃ 🌐 *API Used:* ${apiUsed}
┃ 
┃ ✅ *Status:* Berhasil dikirim
┃ 🎯 *Source:* Facebook
┃ 📱 *Compatible:* Semua device
┃ 
┃ 💡 *Tips:*
┃ • Video sudah dalam format MP4
┃ • Dapat diputar di semua pemutar video
┃ • Kualitas sudah dioptimalkan
┃ • Backup API tersedia jika primary gagal
┃ 
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━❀

_Video Facebook berhasil diunduh menggunakan ${apiUsed} API!_`;

            await ReplyRynzz(successText, m, client);

            // Send audio if available
            if (audioOnly && audioOnly.url) {
                try {
                    await ReplyRynzz("🎵 Mengunduh audio terpisah...", m, client);

                    const audioResponse = await axios.get(audioOnly.url, {
                        responseType: 'arraybuffer',
                        timeout: 60000
                    });

                    if (audioResponse.data) {
                        const audioBuffer = Buffer.from(audioResponse.data);

                        if (audioBuffer.length > 0) {
                            await client.sendMessage(m.key.remoteJid, {
                                audio: audioBuffer,
                                mimetype: 'audio/mpeg',
                                fileName: `facebook_audio_${Date.now()}.mp3`,
                                contextInfo: {
                                    externalAdReply: {
                                        title: "Facebook Audio",
                                        body: `Audio Only • Size: ${audioOnly.size}`,
                                        thumbnailUrl: "https://files.catbox.moe/mxohav.gif",
                                        mediaType: 1,
                                        mediaUrl: fbUrl,
                                        sourceUrl: fbUrl
                                    }
                                }
                            }, { quoted: m });

                            await ReplyRynzz(`🎵 Audio berhasil dikirim! (${audioOnly.size})`, m, client);
                        }
                    }
                } catch (audioError) {
                    // Silent audio error, video sudah berhasil
                }
            }

        } catch (apiError) {
            if (apiError.code === 'ECONNABORTED') {
                await ReplyRynzz("❌ Timeout! Server terlalu lama merespons. Silakan coba lagi.", m, client);
            } else if (apiError.response?.status === 404) {
                await ReplyRynzz("❌ Video Facebook tidak ditemukan! Pastikan link benar dan video dapat diakses publik.", m, client);
            } else if (apiError.response?.status >= 500) {
                await ReplyRynzz("❌ Server API sedang bermasalah. Silakan coba lagi nanti.", m, client);
            } else {
                await ReplyRynzz("❌ Terjadi kesalahan saat mengakses API Facebook!", m, client);
            }
        }

    } catch (error) {
        const errorText = `
╭━━━『 ❌ ERROR FACEBOOK DOWNLOADER 』━━━❀
┃ 
┃ 💥 *Gagal mengunduh video Facebook!*
┃ 
┃ 🔧 *Kemungkinan penyebab:*
┃ • Koneksi internet tidak stabil
┃ • Video Facebook bersifat private
┃ • Link Facebook tidak valid
┃ • Server Facebook membatasi akses
┃ • Video terlalu besar untuk diunduh
┃ 
┃ 💡 *Solusi:*
┃ • Pastikan video bersifat public
┃ • Coba dengan link Facebook lain
┃ • Periksa koneksi internet
┃ • Pastikan link lengkap dan benar
┃ 
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━❀

_Silakan coba lagi dengan link Facebook yang valid!_`;

        await ReplyRynzz(errorText, m, client);
    }
}

module.exports = {
    handleFbCommand,
    checkAccess,
    loadConfig
};

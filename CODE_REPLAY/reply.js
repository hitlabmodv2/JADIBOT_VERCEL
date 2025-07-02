
const fs = require('fs');
const path = require('path');

// Fungsi untuk memuat config
function loadConfig() {
    try {
        const configPath = path.join(process.cwd(), 'config.json');
        if (fs.existsSync(configPath)) {
            const configData = fs.readFileSync(configPath, 'utf8');
            return JSON.parse(configData);
        }
        return getDefaultConfig();
    } catch (error) {
        return getDefaultConfig();
    }
}

function getDefaultConfig() {
    return {
        bot: {
            mode: "public",
            prefix: ".",
            botname: "WilyKun Bot",
            packname: "Auto Read Story",
            thumbnailReply: "https://files.catbox.moe/mxohav.gif",
            wame: "https://wa.me/6289681008411",
            idch: "120363312297133690@newsletter"
        }
    };
}

async function Wily(teks, m, sock) {
    try {
        const config = loadConfig();
        
        // Get accurate Jakarta time
        const now = new Date();
        const jakartaTime = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Jakarta"}));
        
        const hariini = jakartaTime.toLocaleDateString('id-ID', {
            timeZone: 'Asia/Jakarta',
            weekday: 'long',
            day: 'numeric', 
            month: 'long',
            year: 'numeric'
        });
        
        const waktuSekarang = jakartaTime.toLocaleTimeString('id-ID', {
            timeZone: 'Asia/Jakarta',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
        
        // Auto-detect folder name untuk packname dan botname
        const currentDir = process.cwd();
        const folderName = path.basename(currentDir);
        
        const botname = "📖 Auto Reaction Story 💖";
        const packname = "✨ Auto Reaction Story 🤖";
        const thumbnailReply = config.bot?.thumbnailReply || "https://files.catbox.moe/mxohav.gif";
        const wame = config.bot?.wame || "https://wa.me/6289681008411";
        const idch = config.bot?.idch || "120363312297133690@newsletter";

        // Ambil foto profil pengguna (hanya 1 gambar ppuser)
        let ppuser;
        try {
            ppuser = await sock.profilePictureUrl(m.key.remoteJid, 'image');
        } catch {
            ppuser = null; // Tidak ada fallback, hanya ppuser
        }

        const nedd = {      
            contextInfo: {
                forwardingScore: 999,
                isForwarded: true,
                forwardedNewsletterMessageInfo: {
                    newsletterName: `📱 Auto Reaction Story`,
                    newsletterJid: idch,
                },
                externalAdReply: {  
                    showAdAttribution: true,
                    title: `📅 ${hariini} • ${waktuSekarang} WIB`,
                    body: `🤖 Auto Reaction Story ✨`,
                    previewType: "IMAGE",
                    thumbnailUrl: ppuser || "https://files.catbox.moe/mxohav.gif",
                    sourceUrl: wame, 
                },
            },
            text: teks,
        };
        
        return await sock.sendMessage(m.key.remoteJid, nedd, {
            quoted: m,
        });
    } catch (error) {
        // Fallback to simple text if context fails
        return await sock.sendMessage(m.key.remoteJid, { text: teks }, { quoted: m });
    }
}

module.exports = { Wily };

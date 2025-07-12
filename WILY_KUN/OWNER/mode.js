import fs from 'fs';
import path from 'path';
import { Wily } from '../../CODE_REPLY/reply.js';

// Fungsi untuk membuat backup config
function createBackup() {
    try {
        const dataDir = './DATA';
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupFile = path.join(dataDir, `config-backup-${timestamp}.json`);
        const configData = fs.readFileSync('./config.json', 'utf8');

        fs.writeFileSync(backupFile, configData);
    } catch (error) {
        // Silent error handling
    }
}

// Fungsi untuk mengubah mode
function changeMode(newMode) {
    try {
        const config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));

        // Backup sebelum mengubah
        createBackup();

        // Update kedua field untuk konsistensi
        config.SELF = newMode === 'self';
        config.mode = newMode;

        // Simpan config yang sudah diupdate
        fs.writeFileSync('./config.json', JSON.stringify(config, null, 2));

        return true;
    } catch (error) {
        return false;
    }
}

export async function handleModeCommand(m, { hisoka, text, command }) {
    try {
        const config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));
        const senderNumber = m.sender.split('@')[0];

        // Cek apakah user adalah owner
        if (!config.OWNER.includes(senderNumber)) {
            if (!config.SELF && config.mode === 'public') {
                await Wily('🚫 *Maaf, fitur ini khusus untuk Owner Bot*\n\n💡 Hanya Owner yang dapat mengubah mode bot\n\n🔒 Akses terbatas untuk menjaga keamanan bot\n\n✨ Terima kasih atas pengertiannya!', m, hisoka);
            }
            return;
        }

        const args = text.trim().split(' ');
        const modeArg = args[0]?.toLowerCase(); // Ambil langsung dari args[0] karena text sudah tanpa prefix

        // Jika tidak ada argument, tampilkan status
        if (!modeArg || !['self', 'public'].includes(modeArg)) {
            // Baca config terbaru lagi
            const latestConfig = JSON.parse(fs.readFileSync('./config.json', 'utf8'));
            const currentMode = latestConfig.SELF ? 'self' : 'public';
            const modeField = latestConfig.mode || currentMode;

            await Wily(`📊 *MODE BOT*\n\n🔹 Mode saat ini: *${currentMode.toUpperCase()}*\n📋 Status config:\n• SELF: ${latestConfig.SELF}\n• mode: "${modeField}"\n\n📋 *Cara penggunaan:*\n• \`.mode self\` - Bot hanya respon owner\n• \`.mode public\` - Bot respon semua user\n\n💡 *Keterangan:*\n• Mode SELF: Bot hanya merespon owner dan prioritas utama\n• Mode PUBLIC: Bot merespon semua pengguna\n\n⚙️ Data tersimpan otomatis ke config.json\n📁 Backup dibuat di folder DATA`, m, hisoka);
            return;
        }

        const currentMode = config.SELF ? 'self' : 'public';

        // Cek jika mode sudah sama
        if ((modeArg === 'self' && config.SELF) || (modeArg === 'public' && !config.SELF)) {
            await Wily(`ℹ️ Mode bot sudah dalam keadaan *${modeArg.toUpperCase()}*`, m, hisoka);
            return;
        }

        // Ubah mode
        const success = changeMode(modeArg);

        if (success) {
            // Verifikasi perubahan dengan membaca config lagi
            const newConfig = JSON.parse(fs.readFileSync('./config.json', 'utf8'));
            const actualMode = newConfig.SELF ? 'self' : 'public';

            const emoji = modeArg === 'self' ? '🔒' : '🌐';
            const description = modeArg === 'self' 
                ? 'Bot hanya merespon owner dan prioritas utama'
                : 'Bot merespon semua pengguna';

            await Wily(`${emoji} *MODE BERHASIL DIUBAH*\n\n🔄 Mode: *${currentMode.toUpperCase()}* ➜ *${actualMode.toUpperCase()}*\n📝 Status: ${description}\n\n✅ Konfigurasi tersimpan ke config.json\n💾 Backup dibuat di folder DATA\n⚡ Bot terus berjalan tanpa restart\n\n🔍 *Verifikasi:* Mode sekarang ${actualMode.toUpperCase()}`, m, hisoka);
        } else {
            await Wily('❌ Gagal mengubah mode bot. Pastikan file config.json dapat ditulis.', m, hisoka);
        }

    } catch (error) {
        await Wily(`❌ Terjadi kesalahan: ${error.message}`, m, hisoka);
    }
}

// Export untuk digunakan di message.js
export const modeInfo = {
    command: ['mode'],
    description: 'Mengubah mode bot antara self dan public'
};

// Export fungsi utama sebagai mode
export const mode = handleModeCommand;
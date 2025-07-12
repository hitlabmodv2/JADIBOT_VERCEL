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

        // Hapus backup lama dengan timestamp
        const files = fs.readdirSync(dataDir);
        files.forEach(file => {
            if (file.startsWith('config-backup-') && file.endsWith('.json') && file !== 'config-backup.json') {
                fs.unlinkSync(path.join(dataDir, file));
            }
        });

        // Buat backup baru dengan nama tetap
        const configData = fs.readFileSync('./config.json', 'utf8');
        fs.writeFileSync('./DATA/config-backup.json', configData);
    } catch (error) {
        // Silent error handling
    }
}

// Fungsi untuk mengubah status online
function changeOnlineStatus(newStatus) {
    try {
        const config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));

        // Backup sebelum mengubah
        createBackup();

        // Update status online
        config.AUTO_ONLINE = newStatus;

        // Simpan config yang sudah diupdate
        fs.writeFileSync('./config.json', JSON.stringify(config, null, 2));

        return true;
    } catch (error) {
        return false;
    }
}

export async function handleOnlineCommand(m, { hisoka, text, command }) {
    try {
        const config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));
        const senderNumber = m.sender.split('@')[0];

        // Cek apakah user adalah owner
        if (!config.OWNER.includes(senderNumber)) {
            if (!config.SELF && config.mode === 'public') {
                await Wily('🚫 *Maaf, fitur ini khusus untuk Owner Bot*\n\n💡 Hanya Owner yang dapat mengatur status online bot\n\n🔒 Akses terbatas untuk menjaga keamanan bot\n\n✨ Terima kasih atas pengertiannya!', m, hisoka);
            }
            return;
        }

        const args = text.trim().split(' ');
        const statusArg = args[0]?.toLowerCase();

        // Jika tidak ada argument, tampilkan status
        if (!statusArg || !['on', 'off'].includes(statusArg)) {
            // Baca config terbaru lagi
            const latestConfig = JSON.parse(fs.readFileSync('./config.json', 'utf8'));
            const currentStatus = latestConfig.AUTO_ONLINE || false;
            const statusText = currentStatus ? 'ON' : 'OFF';
            const statusEmoji = currentStatus ? '🟢' : '🔴';

            await Wily(`${statusEmoji} *STATUS AUTO ONLINE*\n\n🔹 Status saat ini: *${statusText}*\n📋 Config value: ${currentStatus}\n\n📋 *Cara penggunaan:*\n• \`.online on\` - Aktifkan auto online\n• \`.online off\` - Matikan auto online\n\n💡 *Keterangan:*\n• ON: Bot akan selalu tampil online di WhatsApp\n• OFF: Bot status mengikuti aktivitas normal\n\n⚙️ Data tersimpan otomatis ke config.json\n📁 Backup dibuat di folder DATA`, m, hisoka);
            return;
        }

        const newStatus = statusArg === 'on';
        const currentStatus = config.AUTO_ONLINE || false;

        // Cek jika status sudah sama
        if (newStatus === currentStatus) {
            const statusText = newStatus ? 'ON' : 'OFF';
            await Wily(`ℹ️ Auto online sudah dalam keadaan *${statusText}*`, m, hisoka);
            return;
        }

        // Ubah status online
        const success = changeOnlineStatus(newStatus);

        if (success) {
            // Verifikasi perubahan dengan membaca config lagi
            const newConfig = JSON.parse(fs.readFileSync('./config.json', 'utf8'));
            const actualStatus = newConfig.AUTO_ONLINE || false;
            const statusText = actualStatus ? 'ON' : 'OFF';
            const emoji = actualStatus ? '🟢' : '🔴';

            // Terapkan perubahan langsung ke bot
            if (actualStatus) {
                // Set bot online
                await hisoka.sendPresenceUpdate('available');
            } else {
                // Set bot sesuai aktivitas normal
                await hisoka.sendPresenceUpdate('unavailable');
            }

            await Wily(`${emoji} *AUTO ONLINE BERHASIL DIUBAH*\n\n🔄 Status: *${currentStatus ? 'ON' : 'OFF'}* ➜ *${statusText}*\n📝 Deskripsi: ${actualStatus ? 'Bot selalu tampil online' : 'Bot status normal'}\n\n✅ Konfigurasi tersimpan ke config.json\n💾 Backup dibuat di folder DATA\n⚡ Bot terus berjalan tanpa restart\n\n🔍 *Verifikasi:* Auto online sekarang ${statusText}`, m, hisoka);
        } else {
            await Wily('❌ Gagal mengubah status auto online. Pastikan file config.json dapat ditulis.', m, hisoka);
        }

    } catch (error) {
        await Wily(`❌ Terjadi kesalahan: ${error.message}`, m, hisoka);
    }
}

// Export untuk digunakan di message.js
export const onlineInfo = {
    command: ['online'],
    description: 'Mengatur status auto online bot'
};

// Export fungsi utama sebagai online
export const online = handleOnlineCommand;
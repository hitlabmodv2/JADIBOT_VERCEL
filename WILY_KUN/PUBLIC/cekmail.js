import axios from 'axios';
import * as cheerio from 'cheerio';
import { Wily } from '../../CODE_REPLY/reply.js';

async function checkDataBreach(email) {
  try {
    const url = 'https://periksadata.com/';
    const formData = new URLSearchParams();
    formData.append('email', email);

    const response = await axios.post(url, formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    const $ = cheerio.load(response.data);
    const info = $('.text-center.col-md-6.col-lg-5 > div > h2').text();

    if (info.includes('WAH SELAMAT!')) {
      return [];
    }

    const breaches = [];
    $('div.col-md-6').each((i, element) => {
      try {
        const title = $(element).find('div.feature__body > h5').text().trim();
        const boldElements = $(element).find('div.feature__body > p > b');

        if (boldElements.length >= 3) {
          const date = $(boldElements[0]).text().trim();
          const breachedData = $(boldElements[1]).text().trim();
          const totalBreach = $(boldElements[2]).text().trim();

          if(title) {
            breaches.push({
              title,
              date,
              breached_data: breachedData,
              total_breach: totalBreach
            });
          }
        }
      } catch (error) {
        console.error('Error parsing breach data:', error);
      }
    });

    return breaches;
  } catch (error) {
    console.error('Error checking data breach:', error.message);
    throw new Error('Gagal terhubung ke PeriksaData.com atau terjadi kesalahan.');
  }
}

export async function cekmail(m, { hisoka, text, command }) {
    try {
        const email = text.trim();
        
        // Validasi input
        if (!email || email === '') {
            await Wily(`❌ *EMAIL TIDAK DIMASUKKAN*\n\n📋 *Cara penggunaan:*\n• \`.cekmail [email]\` - Cek data email\n\n💡 *Contoh:*\n• \`.cekmail example@gmail.com\`\n• \`.cekmail user@yahoo.com\`\n\n⚠️ Masukkan email yang valid`, m, hisoka);
            return;
        }
        
        // Validasi format email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            await Wily(`❌ *FORMAT EMAIL TIDAK VALID*\n\n📧 *Email:* ${email}\n\n💡 *Format yang benar:*\n• username@domain.com\n• example@gmail.com\n• user@yahoo.co.id\n\n⚠️ Pastikan email mengandung @ dan domain yang valid`, m, hisoka);
            return;
        }

        // Kirim pesan loading
        const loadingMessage = await Wily(`🔍 *SEDANG MEMERIKSA EMAIL*\n\n📧 *Target:* ${email}\n⏳ *Status:* Mencari data...\n🔄 *Proses:* Menganalisis informasi email\n\n💫 *Mohon tunggu sebentar...*`, m, hisoka);

        try {
            // Panggil fungsi checkDataBreach yang sesungguhnya
            const breaches = await checkDataBreach(email);

            let resultMessage = `🔍 *HASIL PEMERIKSAAN EMAIL*\n\n📧 *Email:* ${email}\n📅 *Tanggal Cek:* ${new Date().toLocaleDateString('id-ID')}\n⏰ *Waktu:* ${new Date().toLocaleTimeString('id-ID')}\n\n`;

            if (breaches.length > 0) {
                resultMessage += `🚨 *STATUS:* TERDETEKSI BREACH\n🔢 *Jumlah Breach:* ${breaches.length}\n\n`;
                
                for (let i = 0; i < breaches.length; i++) {
                    const breach = breaches[i];
                    resultMessage += `📋 *BREACH ${i + 1}:*\n`;
                    resultMessage += `• *Platform:* ${breach.title}\n`;
                    resultMessage += `• *Tanggal:* ${breach.date}\n`;
                    resultMessage += `• *Data Bocor:* ${breach.breached_data}\n`;
                    resultMessage += `• *Total Korban:* ${breach.total_breach}\n\n`;
                }
                
                resultMessage += `⚠️ *PERINGATAN:*\n• Email ini pernah terlibat dalam data breach\n• Segera ganti password akun terkait\n• Aktifkan 2FA jika tersedia\n• Monitor aktivitas akun secara berkala\n\n🔒 *Rekomendasi Keamanan:*\n• Gunakan password yang kuat dan unik\n• Jangan gunakan password yang sama di multiple akun\n• Pertimbangkan menggunakan password manager\n• Waspada terhadap email phishing`;
            } else {
                resultMessage += `✅ *STATUS:* AMAN\n🔒 *Breach:* Tidak terdeteksi\n\n🎉 *KABAR BAIK:*\n• Email ini tidak ditemukan dalam database breach\n• Tidak ada indikasi kebocoran data\n• Akun relatif aman dari breach yang diketahui\n\n💡 *Tetap Waspada:*\n• Gunakan password yang kuat\n• Aktifkan 2FA untuk keamanan ekstra\n• Monitor aktivitas akun secara berkala\n• Jangan klik link mencurigakan`;
            }

            resultMessage += `\n\n🔍 *SUMBER DATA:*\n• PeriksaData.com\n• Database breach publik\n• Monitoring keamanan siber\n\n⚡ *Powered by WilyKun Security Check*`;

            // Update loading message dengan hasil
            await hisoka.sendMessage(m.from, { 
                text: resultMessage,
                edit: loadingMessage.key 
            });

        } catch (error) {
            // Jika ada error, kirim pesan error
            await hisoka.sendMessage(m.from, { 
                text: `❌ *GAGAL MEMERIKSA EMAIL*\n\n🔧 *Error:* ${error.message}\n📧 *Email:* ${email}\n\n💡 *Kemungkinan Penyebab:*\n• Koneksi internet tidak stabil\n• Server sedang maintenance\n• Email format tidak didukung\n\n🔄 *Coba lagi dalam beberapa menit*`,
                edit: loadingMessage.key 
            });
        }

    } catch (error) {
        await Wily(`❌ *TERJADI KESALAHAN*\n\n🔧 Error: ${error.message}\n💡 Coba lagi dalam beberapa menit\n\n📞 Hubungi admin jika masalah berlanjut`, m, hisoka);
    }
};

// Export command info
export const cekmailInfo = {
    command: ["cekmail", "cekdata"],
    category: "tools", 
    description: "Mengecek apakah email pernah mengalami kebocoran data.",
    limit: 5
};
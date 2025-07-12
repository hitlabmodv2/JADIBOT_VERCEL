
import os from 'os';
import fs from 'fs';
import { Wily } from '../../CODE_REPLY/reply.js';

// Fungsi untuk mendapatkan penggunaan RAM dalam format yang mudah dibaca
function getMemoryUsage() {
    const used = process.memoryUsage();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;

    return {
        heapUsed: formatBytes(used.heapUsed),
        heapTotal: formatBytes(used.heapTotal),
        external: formatBytes(used.external),
        rss: formatBytes(used.rss),
        arrayBuffers: formatBytes(used.arrayBuffers || 0),
        systemUsed: formatBytes(usedMem),
        systemTotal: formatBytes(totalMem),
        systemFree: formatBytes(freeMem),
        percentageUsed: ((usedMem / totalMem) * 100).toFixed(2),
        heapPercentage: ((used.heapUsed / used.heapTotal) * 100).toFixed(2)
    };
}

// Fungsi untuk format bytes ke format yang mudah dibaca
function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Fungsi untuk mendapatkan informasi CPU yang lebih detail
function getCPUInfo() {
    const cpus = os.cpus();
    const numCores = cpus.length;
    const model = cpus[0].model;
    const speed = cpus[0].speed;
    
    // Hitung rata-rata load CPU
    const loads = os.loadavg();
    const loadPercentage = ((loads[0] / numCores) * 100).toFixed(2);
    
    // CPU Architecture info
    const arch = os.arch();
    
    return {
        cores: numCores,
        model: model.replace(/\s+/g, ' ').trim(),
        speed: `${speed} MHz`,
        architecture: arch,
        load1min: loads[0].toFixed(2),
        load5min: loads[1].toFixed(2),
        load15min: loads[2].toFixed(2),
        loadPercentage: loadPercentage + '%',
        threadsPerCore: 'Unknown', // Linux specific info bisa ditambah jika diperlukan
        cacheSize: 'Unknown' // Bisa ditambah dengan informasi cache CPU
    };
}

// Fungsi untuk mendapatkan informasi platform hosting
function getHostingInfo() {
    const platform = os.platform();
    const release = os.release();
    const hostname = os.hostname();
    
    // Deteksi platform hosting berdasarkan hostname dan environment
    let hostingPlatform = 'Unknown';
    let hostingType = 'Unknown';
    
    // Deteksi Replit
    if (hostname.includes('repl') || process.env.REPL_ID || process.env.REPLIT_DB_URL) {
        hostingPlatform = 'Replit Cloud';
        hostingType = 'Container-based PaaS';
    }
    // Deteksi Railway
    else if (process.env.RAILWAY_ENVIRONMENT || hostname.includes('railway')) {
        hostingPlatform = 'Railway Cloud';
        hostingType = 'Container Platform';
    }
    // Deteksi Heroku
    else if (process.env.DYNO || hostname.includes('heroku')) {
        hostingPlatform = 'Heroku';
        hostingType = 'Dyno Container';
    }
    // Deteksi Vercel
    else if (process.env.VERCEL || process.env.NOW_REGION) {
        hostingPlatform = 'Vercel';
        hostingType = 'Serverless Platform';
    }
    // Deteksi VPS/Dedicated
    else if (platform === 'linux') {
        if (fs.existsSync('/proc/1/cgroup')) {
            try {
                const cgroup = fs.readFileSync('/proc/1/cgroup', 'utf8');
                if (cgroup.includes('docker')) {
                    hostingPlatform = 'Docker Container';
                    hostingType = 'Containerized VPS';
                } else {
                    hostingPlatform = 'Linux VPS/Dedicated';
                    hostingType = 'Virtual Private Server';
                }
            } catch {
                hostingPlatform = 'Linux Server';
                hostingType = 'Unknown Server Type';
            }
        }
    }
    
    return {
        platform: hostingPlatform,
        type: hostingType,
        os: `${platform} ${release}`,
        hostname: hostname,
        containerized: process.env.container ? 'Yes' : 'No'
    };
}

// Fungsi untuk mendapatkan informasi network
function getNetworkInfo() {
    const interfaces = os.networkInterfaces();
    const mainInterface = Object.values(interfaces).flat().find(iface => 
        iface.family === 'IPv4' && !iface.internal
    );
    
    return {
        ip: mainInterface?.address || 'Unknown',
        mac: mainInterface?.mac || 'Unknown',
        gateway: 'Unknown' // Bisa ditambah dengan command ip route jika diperlukan
    };
}

// Fungsi untuk mendapatkan runtime yang diformat
function getFormattedRuntime() {
    const processUptime = process.uptime();
    const systemUptime = os.uptime();
    
    const formatTime = (seconds) => {
        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        
        let result = '';
        if (days > 0) result += `${days}d `;
        if (hours > 0) result += `${hours}h `;
        if (minutes > 0) result += `${minutes}m `;
        result += `${secs}s`;
        
        return result;
    };
    
    return {
        processUptime: formatTime(processUptime),
        systemUptime: formatTime(systemUptime),
        processUptimeSeconds: processUptime,
        systemUptimeSeconds: systemUptime,
        startTime: new Date(Date.now() - processUptime * 1000).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })
    };
}

// Fungsi untuk mendapatkan informasi sistem yang lebih lengkap
function getSystemInfo() {
    const envs = {
        nodeVersion: process.version,
        npmVersion: process.env.npm_version || 'Unknown',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        locale: Intl.DateTimeFormat().resolvedOptions().locale
    };

    return {
        platform: os.platform(),
        arch: os.arch(),
        hostname: os.hostname(),
        nodeVersion: envs.nodeVersion,
        npmVersion: envs.npmVersion,
        pid: process.pid,
        ppid: process.ppid,
        uid: process.getuid ? process.getuid() : 'Unknown',
        gid: process.getgid ? process.getgid() : 'Unknown',
        timezone: envs.timezone,
        locale: envs.locale,
        workingDirectory: process.cwd(),
        execPath: process.execPath
    };
}

// Fungsi untuk mendapatkan informasi storage
function getStorageInfo() {
    try {
        const stats = fs.statSync(process.cwd());
        return {
            currentDir: process.cwd(),
            writable: fs.constants.W_OK ? 'Yes' : 'Unknown',
            accessible: 'Yes'
        };
    } catch {
        return {
            currentDir: process.cwd(),
            writable: 'Unknown',
            accessible: 'Limited'
        };
    }
}

// Fungsi untuk menghitung ping/latency
function calculatePing(startTime) {
    return Date.now() - startTime;
}

// Handler untuk command runtime
export async function handleRuntimeCommand(m, { hisoka, text, command }) {
    const startTime = Date.now();
    
    try {
        const config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));
        const senderNumber = m.sender.split('@')[0];

        // Cek mode bot dan akses
        let hasAccess = false;
        if (config.SELF && config.mode === 'self') {
            hasAccess = config.OWNER.includes(senderNumber);
        } else if (!config.SELF && config.mode === 'public') {
            hasAccess = true;
        }

        if (!hasAccess) {
            return;
        }

        // Dapatkan semua informasi sistem
        const memory = getMemoryUsage();
        const cpu = getCPUInfo();
        const runtime = getFormattedRuntime();
        const system = getSystemInfo();
        const hosting = getHostingInfo();
        const network = getNetworkInfo();
        const storage = getStorageInfo();
        const ping = calculatePing(startTime);

        const runtimeMessage = `🤖 *INFORMASI RUNTIME BOT LENGKAP*

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🏗️ *PLATFORM HOSTING*
├ 🌐 Platform: ${hosting.platform}
├ 🔧 Type: ${hosting.type}
├ 💻 OS: ${hosting.os}
├ 🏷️ Hostname: ${hosting.hostname}
└ 📦 Container: ${hosting.containerized}

⏱️ *WAKTU OPERASIONAL*
├ 🔄 Bot Runtime: ${runtime.processUptime}
├ ⚡ System Uptime: ${runtime.systemUptime}
├ 🚀 Started: ${runtime.startTime}
├ 📊 Process PID: ${system.pid}
└ 👨‍💼 Parent PID: ${system.ppid}

💾 *PENGGUNAAN MEMORI*
├ 🗂️ Heap Used: ${memory.heapUsed} (${memory.heapPercentage}%)
├ 📦 Heap Total: ${memory.heapTotal}
├ 🔗 External: ${memory.external}
├ 📈 RSS Memory: ${memory.rss}
├ 🔋 Array Buffers: ${memory.arrayBuffers}
├ 🖥️ System Used: ${memory.systemUsed}
├ 💿 System Total: ${memory.systemTotal}
├ 🆓 System Free: ${memory.systemFree}
└ 📊 Usage: ${memory.percentageUsed}%

🔧 *SPESIFIKASI CPU*
├ ⚙️ Cores: ${cpu.cores} Core
├ 🏷️ Model: ${cpu.model}
├ 🏗️ Architecture: ${cpu.architecture}
├ ⚡ Speed: ${cpu.speed}
├ 📊 Load 1m: ${cpu.load1min}
├ 📊 Load 5m: ${cpu.load5min}
├ 📊 Load 15m: ${cpu.load15min}
└ 💹 CPU Usage: ${cpu.loadPercentage}

🖥️ *SISTEM OPERASI*
├ 🔧 Platform: ${system.platform}
├ 🏗️ Architecture: ${system.arch}
├ 🟢 Node.js: ${system.nodeVersion}
├ 📦 NPM: ${system.npmVersion}
├ 🌍 Timezone: ${system.timezone}
├ 🗣️ Locale: ${system.locale}
├ 👤 UID/GID: ${system.uid}/${system.gid}
└ 📁 Working Dir: ${storage.currentDir}

🌐 *INFORMASI NETWORK*
├ 🌍 IP Address: ${network.ip}
├ 🔗 MAC Address: ${network.mac}
└ 📝 Writable: ${storage.writable}

⚡ *PERFORMA & KONFIGURASI*
├ 📡 Response Time: ${ping}ms
├ 🔥 Status: ${ping < 100 ? 'Excellent ⚡' : ping < 300 ? 'Good 🟢' : ping < 500 ? 'Fair 🟡' : 'Slow 🔴'}
├ 🚀 Mode: ${config.mode.toUpperCase()}
├ 🤖 Auto Online: ${config.AUTO_ONLINE ? 'ON' : 'OFF'}
├ ⌨️ Auto Typing: ${config.AUTO_TYPING ? 'ON' : 'OFF'}
├ 🎙️ Auto Record: ${config.AUTO_RECORD ? 'ON' : 'OFF'}
└ 💾 Write Store: ${config.WRITE_STORE ? 'ON' : 'OFF'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🤖 *WilyKun Bot* - System Monitor
⏰ Diambil pada: ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}
🔍 Platform: ${hosting.platform} | Runtime: ${runtime.processUptime}`;

        await Wily(runtimeMessage, m, hisoka);

    } catch (error) {
        await Wily('❌ Terjadi kesalahan saat mengambil informasi runtime bot.', m, hisoka);
    }
}

// Handler untuk command ping
export async function handlePingCommand(m, { hisoka, text, command }) {
    const startTime = Date.now();
    
    try {
        const config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));
        const senderNumber = m.sender.split('@')[0];

        // Cek mode bot dan akses
        let hasAccess = false;
        if (config.SELF && config.mode === 'self') {
            hasAccess = config.OWNER.includes(senderNumber);
        } else if (!config.SELF && config.mode === 'public') {
            hasAccess = true;
        }

        if (!hasAccess) {
            return;
        }

        // Dapatkan semua informasi sistem
        const memory = getMemoryUsage();
        const cpu = getCPUInfo();
        const runtime = getFormattedRuntime();
        const system = getSystemInfo();
        const hosting = getHostingInfo();
        const network = getNetworkInfo();
        const storage = getStorageInfo();
        const ping = calculatePing(startTime);

        const runtimeMessage = `🤖 *INFORMASI RUNTIME BOT LENGKAP*

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🏗️ *PLATFORM HOSTING*
├ 🌐 Platform: ${hosting.platform}
├ 🔧 Type: ${hosting.type}
├ 💻 OS: ${hosting.os}
├ 🏷️ Hostname: ${hosting.hostname}
└ 📦 Container: ${hosting.containerized}

⏱️ *WAKTU OPERASIONAL*
├ 🔄 Bot Runtime: ${runtime.processUptime}
├ ⚡ System Uptime: ${runtime.systemUptime}
├ 🚀 Started: ${runtime.startTime}
├ 📊 Process PID: ${system.pid}
└ 👨‍💼 Parent PID: ${system.ppid}

💾 *PENGGUNAAN MEMORI*
├ 🗂️ Heap Used: ${memory.heapUsed} (${memory.heapPercentage}%)
├ 📦 Heap Total: ${memory.heapTotal}
├ 🔗 External: ${memory.external}
├ 📈 RSS Memory: ${memory.rss}
├ 🔋 Array Buffers: ${memory.arrayBuffers}
├ 🖥️ System Used: ${memory.systemUsed}
├ 💿 System Total: ${memory.systemTotal}
├ 🆓 System Free: ${memory.systemFree}
└ 📊 Usage: ${memory.percentageUsed}%

🔧 *SPESIFIKASI CPU*
├ ⚙️ Cores: ${cpu.cores} Core
├ 🏷️ Model: ${cpu.model}
├ 🏗️ Architecture: ${cpu.architecture}
├ ⚡ Speed: ${cpu.speed}
├ 📊 Load 1m: ${cpu.load1min}
├ 📊 Load 5m: ${cpu.load5min}
├ 📊 Load 15m: ${cpu.load15min}
└ 💹 CPU Usage: ${cpu.loadPercentage}

🖥️ *SISTEM OPERASI*
├ 🔧 Platform: ${system.platform}
├ 🏗️ Architecture: ${system.arch}
├ 🟢 Node.js: ${system.nodeVersion}
├ 📦 NPM: ${system.npmVersion}
├ 🌍 Timezone: ${system.timezone}
├ 🗣️ Locale: ${system.locale}
├ 👤 UID/GID: ${system.uid}/${system.gid}
└ 📁 Working Dir: ${storage.currentDir}

🌐 *INFORMASI NETWORK*
├ 🌍 IP Address: ${network.ip}
├ 🔗 MAC Address: ${network.mac}
└ 📝 Writable: ${storage.writable}

⚡ *PERFORMA & KONFIGURASI*
├ 📡 Response Time: ${ping}ms
├ 🔥 Status: ${ping < 100 ? 'Excellent ⚡' : ping < 300 ? 'Good 🟢' : ping < 500 ? 'Fair 🟡' : 'Slow 🔴'}
├ 🚀 Mode: ${config.mode.toUpperCase()}
├ 🤖 Auto Online: ${config.AUTO_ONLINE ? 'ON' : 'OFF'}
├ ⌨️ Auto Typing: ${config.AUTO_TYPING ? 'ON' : 'OFF'}
├ 🎙️ Auto Record: ${config.AUTO_RECORD ? 'ON' : 'OFF'}
└ 💾 Write Store: ${config.WRITE_STORE ? 'ON' : 'OFF'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🤖 *WilyKun Bot* - System Monitor
⏰ Diambil pada: ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}
🔍 Platform: ${hosting.platform} | Runtime: ${runtime.processUptime}`;

        await Wily(runtimeMessage, m, hisoka);

    } catch (error) {
        await Wily('❌ Terjadi kesalahan saat mengambil informasi runtime bot.', m, hisoka);
    }
}

// Export info untuk command
export const runtimeInfo = {
    command: ['runtime', 'rt'],
    description: 'Menampilkan informasi lengkap runtime dan sistem bot'
};

export const pingInfo = {
    command: ['ping', 'speed'],
    description: 'Mengukur kecepatan respon bot dan menampilkan info sistem'
};

// Export fungsi utama
export const runtime = handleRuntimeCommand;
export const ping = handlePingCommand;

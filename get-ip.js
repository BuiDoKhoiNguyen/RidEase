const fs = require('fs');
const path = require('path');
const os = require('os');

// Lấy địa chỉ IP của máy tính
function getLocalIP() {
  const interfaces = os.networkInterfaces();
  let ipAddress = '';
  
  // Ưu tiên các interface WiFi và Ethernet
  const preferredInterfaces = ['en0', 'en1', 'eth0', 'wlan0'];
  
  for (const name of preferredInterfaces) {
    const iface = interfaces[name];
    if (iface) {
      for (const connection of iface) {
        // Chỉ lấy IPv4 và không phải loopback (127.0.0.1)
        if (connection.family === 'IPv4' && !connection.internal) {
          ipAddress = connection.address;
          console.log(`Đã tìm thấy địa chỉ IP: ${ipAddress} trên interface ${name}`);
          return ipAddress;
        }
      }
    }
  }
  
  // Nếu không tìm thấy trong các interface ưu tiên, duyệt qua tất cả
  for (const name in interfaces) {
    for (const connection of interfaces[name]) {
      if (connection.family === 'IPv4' && !connection.internal) {
        ipAddress = connection.address;
        console.log(`Đã tìm thấy địa chỉ IP: ${ipAddress} trên interface ${name}`);
        return ipAddress;
      }
    }
  }
  
  console.log('Không tìm thấy địa chỉ IP, sử dụng localhost');
  return '127.0.0.1';
}

// Cập nhật file .env với IP tìm được
function updateEnvFile(filePath, ipAddress) {
  try {
    let content = '';
    
    // Đọc file .env nếu tồn tại
    if (fs.existsSync(filePath)) {
      content = fs.readFileSync(filePath, 'utf8');
    }
    
    // Cập nhật hoặc thêm biến EXPO_PUBLIC_SERVER_URI
    const serverRegex = /EXPO_PUBLIC_SERVER_URI=(.*)/;
    const newServerUri = `EXPO_PUBLIC_SERVER_URI=http://${ipAddress}:8080/api/v1`;
    
    // Cập nhật hoặc thêm biến EXPO_PUBLIC_WEBSOCKET_URI
    const wsRegex = /EXPO_PUBLIC_WEBSOCKET_URI=(.*)/;
    const newWsUri = `EXPO_PUBLIC_WEBSOCKET_URI=ws://${ipAddress}:8085`;
    
    if (content.match(serverRegex)) {
      // Nếu biến đã tồn tại, cập nhật giá trị
      content = content.replace(serverRegex, newServerUri);
    } else {
      // Nếu biến chưa tồn tại, thêm mới
      content += content.endsWith('\n') ? newServerUri : '\n' + newServerUri;
    }
    
    if (content.match(wsRegex)) {
      // Nếu biến WebSocket đã tồn tại, cập nhật giá trị
      content = content.replace(wsRegex, newWsUri);
    } else {
      // Nếu biến WebSocket chưa tồn tại, thêm mới
      content += content.endsWith('\n') ? newWsUri : '\n' + newWsUri;
    }
    
    // Ghi lại vào file .env
    fs.writeFileSync(filePath, content);
    console.log(`Đã cập nhật file ${filePath} với địa chỉ IP: ${ipAddress}`);
    
    return true;
  } catch (error) {
    console.error(`Lỗi khi cập nhật file ${filePath}:`, error);
    return false;
  }
}

// Thực thi script
const ipAddress = getLocalIP();
const projectRoot = process.cwd();

// Cập nhật file .env trong thư mục user
const userEnvPath = path.join(projectRoot, 'user', '.env');
updateEnvFile(userEnvPath, ipAddress);

// Cập nhật file .env trong thư mục driver
const driverEnvPath = path.join(projectRoot, 'driver', '.env');
updateEnvFile(driverEnvPath, ipAddress);

console.log('Hoàn tất cập nhật địa chỉ IP trong các file .env');
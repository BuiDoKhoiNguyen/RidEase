const express = require("express");
const { WebSocketServer } = require("ws");
const geolib = require("geolib");

const app = express();
const PORT = 3000;

// Store driver locations and their WebSocket connections
let drivers = {};
let driverConnections = {};
let userConnections = {};
let rideRequests = {};
// Lưu trữ danh sách người dùng đang theo dõi vị trí của từng tài xế
let driverLocationSubscribers = {};
// Lưu trữ retryIntervals để có thể dừng chúng khi cần
let retryIntervals = {};

// Create WebSocket server
const wss = new WebSocketServer({ port: 8085 });

wss.on("connection", (ws) => {
  let driverId = null;
  let userId = null;

  ws.on("message", (message) => {
    try {
      const data = JSON.parse(message);

      if (data.type === "driverConnect") {
        driverId = data.driverId;
        driverConnections[driverId] = ws;
        console.log(`Driver ${driverId} connected via WebSocket`);
      }
      
      if (data.type === "userConnect") {
        userId = data.userId;
        userConnections[userId] = ws;
        console.log(`User ${userId} connected via WebSocket`);
        
        // Kiểm tra xem người dùng có đang theo dõi tài xế nào không
        Object.keys(driverLocationSubscribers).forEach(driverId => {
          const subscribers = driverLocationSubscribers[driverId];
          const isSubscribing = subscribers.some(sub => 
            (typeof sub === 'object' ? sub.userId === userId : sub === userId)
          );
          
          if (isSubscribing) {
            console.log(`[INFO] User ${userId} reconnected and was subscribed to driver ${driverId}`);
            
            // Gửi ngay vị trí hiện tại của tài xế nếu có
            if (drivers[driverId]) {
              ws.send(JSON.stringify({
                type: "driverLocationUpdate",
                driverId: driverId,
                data: drivers[driverId]
              }));
            }
          }
        });
      }

      // Xử lý khi người dùng hủy đăng ký theo dõi vị trí tài xế
      if (data.type === "unsubscribeFromDriverLocation") {
        const targetDriverId = data.driverId;
        const subscriberId = data.userId;
        
        if (!targetDriverId || !subscriberId) {
          console.error("[ERROR] Missing driverId or userId in unsubscribe request:", data);
          return;
        }
        
        if (driverLocationSubscribers[targetDriverId]) {
          // Xóa người dùng khỏi danh sách người theo dõi tài xế
          driverLocationSubscribers[targetDriverId] = driverLocationSubscribers[targetDriverId].filter(sub => {
            return typeof sub === 'object' ? sub.userId !== subscriberId : sub !== subscriberId;
          });
          
          console.log(`[INFO] User ${subscriberId} unsubscribed from driver ${targetDriverId} location updates`);
        }
      }
        
      // Xử lý khi người dùng đăng ký theo dõi vị trí của tài xế
      if (data.type === "subscribeToDriverLocation") {
        const targetDriverId = data.driverId;
        
        // Thêm kiểm tra userId
        if (!data.userId) {
          console.error("[ERROR] Missing userId in subscribeToDriverLocation:", data);
          ws.send(JSON.stringify({
            type: "error",
            message: "Missing userId in subscribe request"
          }));
          return;
        }
        
        // Sử dụng userId từ request thay vì từ phạm vi cha
        const subscriberId = data.userId;
        
        // Lưu trữ kết nối người dùng nếu chưa có (đảm bảo userConnections có entry)
        if (!userConnections[subscriberId]) {
          userConnections[subscriberId] = ws;
          userId = subscriberId; // Cập nhật userId trong phạm vi hàm xử lý kết nối
          console.log(`User ${subscriberId} auto-connected via subscription`);
        }
        
        // Kiểm tra xem tài xế tồn tại không
        if (!drivers[targetDriverId]) {
          console.log(`[WARNING] No location data for driver ${targetDriverId} yet`);
        }
        
        if (!driverLocationSubscribers[targetDriverId]) {
          driverLocationSubscribers[targetDriverId] = [];
        }
        
        // Lưu thêm requestId vào thông tin đăng ký
        const subscriptionInfo = {
          userId: subscriberId,
          requestId: data.requestId,
          timestamp: Date.now()
        };
        
        // Thêm người dùng vào danh sách người theo dõi tài xế này
        const existingSubscriberIndex = driverLocationSubscribers[targetDriverId].findIndex(
          item => typeof item === 'object' ? item.userId === subscriberId : item === subscriberId
        );
        
        if (existingSubscriberIndex !== -1) {
          // Cập nhật thông tin đăng ký nếu đã tồn tại
          driverLocationSubscribers[targetDriverId][existingSubscriberIndex] = subscriptionInfo;
        } else {
          // Thêm mới nếu chưa tồn tại
          driverLocationSubscribers[targetDriverId].push(subscriptionInfo);
        }
        
        console.log(`User ${subscriberId} subscribed to driver ${targetDriverId} location updates with requestId ${data.requestId}`);
        
        // Gửi ngay vị trí hiện tại của tài xế nếu có
        if (drivers[targetDriverId]) {
          ws.send(JSON.stringify({
            type: "driverLocationUpdate",
            driverId: targetDriverId,
            data: drivers[targetDriverId],
            requestId: data.requestId // Thêm requestId vào phản hồi
          }));
          console.log(`Sent initial location to user ${subscriberId} for driver ${targetDriverId}`);
        } else {
          ws.send(JSON.stringify({
            type: "info",
            message: "Đã đăng ký theo dõi vị trí tài xế nhưng chưa có dữ liệu vị trí",
            requestId: data.requestId
          }));
        }
      }

      // Xử lý khi tài xế cập nhật vị trí
      if (data.type === "locationUpdate" && data.role === "driver") {
        // Chỉ sử dụng trường driverId
        const driverId = data.driverId;
        
        if (!driverId) {
          console.error("[ERROR] Missing driverId in locationUpdate:", data);
          return;
        }
        
        const rideId = data.rideId || null;
        
        drivers[driverId] = {
          latitude: data.data.latitude,
          longitude: data.data.longitude,
          heading: data.data.heading || 0,
          status: data.data.status || "available"
        };
        driverConnections[driverId] = ws;
        console.log(`[DEBUG] Updated driver location for ${driverId}:`, drivers[driverId]);
        
        // Gửi cập nhật vị trí cho các người dùng đang theo dõi tài xế này
        if (driverLocationSubscribers[driverId] && driverLocationSubscribers[driverId].length > 0) {
          console.log(`[DEBUG] Sending location update to ${driverLocationSubscribers[driverId].length} subscribers for driver ${driverId}`);
          
          driverLocationSubscribers[driverId].forEach(subscriber => {
            // Kiểm tra xem subscriber là chuỗi hay đối tượng
            const subscriberId = typeof subscriber === 'object' ? subscriber.userId : subscriber;
            const requestId = typeof subscriber === 'object' ? subscriber.requestId : null;
            
            const subscriberWs = userConnections[subscriberId];
            if (subscriberWs && subscriberWs.readyState === 1) { // 1 = OPEN
              subscriberWs.send(JSON.stringify({
                type: "driverLocationUpdate",
                driverId: driverId,
                rideId: rideId,
                data: drivers[driverId],
                requestId: requestId
              }));
              console.log(`[DEBUG] Sent location update to user ${subscriberId} for request ${requestId || 'unknown'}`);
            } else {
              console.log(`[WARNING] Cannot send update to user ${subscriberId} - connection not available`);
            }
          });
        } else {
          console.log(`[INFO] No subscribers for driver ${driverId}`);
        }
      }

      // Xử lý khi người dùng tìm tài xế gần đó
      if (data.type === "requestRide" && data.role === "user") {
        userId = data.userId;
        console.log("Requesting ride...");
        console.log("Available drivers before search:", Object.keys(drivers).map(id => ({ 
          id, 
          status: drivers[id].status,
          location: { lat: drivers[id].latitude, lng: drivers[id].longitude }
        })));
        
        const requestId = Date.now().toString();
        
        // Lưu thông tin yêu cầu chuyến đi
        rideRequests[requestId] = {
          id: requestId,
          userId: data.userId,
          userName: data.userName || "User",
          userLocation: {
            latitude: data.latitude,
            longitude: data.longitude,
            locationName: data.locationName || "Current Location"
          },
          destination: data.destination || {
            latitude: 0,
            longitude: 0,
            locationName: "Unknown Destination"
          },
          distance: data.distance || 0,
          timestamp: Date.now(),
          status: "pending",
          userConnection: ws
        };
        
        // Thiết lập các biến cho tìm kiếm tài xế lặp lại
        let retries = 0;
        let foundDrivers = false;
        const MAX_RETRIES = 10; // Số lần thử tối đa
        
        const searchDrivers = () => {
          console.log(`Tìm tài xế lần thứ ${retries + 1}...`);
          const nearbyDrivers = findNearbyDrivers(data.latitude, data.longitude);
          console.log(`Tìm thấy ${nearbyDrivers.length} tài xế gần đó`);
          
          // Nếu tìm thấy tài xế hoặc đã thử đủ số lần
          if (nearbyDrivers.length > 0 || retries >= MAX_RETRIES) {
            // Gửi danh sách tài xế cho người dùng
            if (ws.readyState === 1) { // 1 = OPEN
              ws.send(
                JSON.stringify({ 
                  type: "nearbyDrivers", 
                  requestId: requestId,
                  drivers: nearbyDrivers 
                })
              );
            }
            
            // Nếu tìm thấy tài xế, đánh dấu đã tìm thấy và dừng tìm kiếm
            if (nearbyDrivers.length > 0) {
              foundDrivers = true;
              if (retryIntervals[requestId]) {
                clearInterval(retryIntervals[requestId]);
                delete retryIntervals[requestId];
              }
            }
            
            // Nếu đã thử tối đa số lần và không tìm thấy tài xế
            if (retries >= MAX_RETRIES && !foundDrivers) {
              if (retryIntervals[requestId]) {
                clearInterval(retryIntervals[requestId]);
                delete retryIntervals[requestId];
              }
              
              if (ws.readyState === 1) {
                ws.send(JSON.stringify({
                  type: "requestFailed",
                  message: "Không tìm thấy tài xế sau nhiều lần thử. Vui lòng thử lại sau."
                }));
              }
            }
          }
          
          retries++;
        };
        
        // Tìm kiếm ngay lần đầu
        searchDrivers();
        
        // Nếu không tìm thấy, thiết lập tìm kiếm lặp lại
        if (!foundDrivers) {
          retryIntervals[requestId] = setInterval(searchDrivers, 5000); // 5 giây tìm một lần
          
          // Dừng tìm kiếm sau 50 giây (MAX_RETRIES * 5000ms) nếu chưa dừng trước đó
          setTimeout(() => {
            if (retryIntervals[requestId]) {
              clearInterval(retryIntervals[requestId]);
              delete retryIntervals[requestId];
              
              if (!foundDrivers && ws.readyState === 1) {
                ws.send(JSON.stringify({
                  type: "requestFailed",
                  message: "Không tìm thấy tài xế. Vui lòng thử lại sau."
                }));
              }
            }
          }, MAX_RETRIES * 5000);
        }
        
        // Lưu kết nối của người dùng
        userConnections[userId] = ws;
      }

      // Xử lý khi người dùng chọn tài xế và đặt xe
      if (data.type === "bookRide" && data.role === "user") {
        const requestId = data.requestId;
        const driverId = data.driverId;
        userId = data.userId;
        
        // Kiểm tra xem tài xế có sẵn sàng không
        if (drivers[driverId] && drivers[driverId].status === "available") {
          // Cập nhật thông tin yêu cầu chuyến đi
          if (rideRequests[requestId]) {
            rideRequests[requestId].driverId = driverId;
            rideRequests[requestId].fare = data.fare;
            rideRequests[requestId].distance = data.distance;
            
            // Đảm bảo cập nhật thông tin điểm đến từ người dùng
            if (data.destination) {
              rideRequests[requestId].destination = data.destination;
            }
            
            // Gửi thông báo cho tài xế
            const driverWs = driverConnections[driverId];
            if (driverWs && driverWs.readyState === 1) { // 1 = OPEN
              driverWs.send(JSON.stringify({
                type: "rideRequest",
                requestId: requestId,
                userId: userId,
                userName: rideRequests[requestId].userName,
                userPhone: data.phoneNumber,
                pickupLocation: rideRequests[requestId].userLocation,
                destination: rideRequests[requestId].destination,
                distance: data.distance || 0,
                fare: data.fare || 0
              }));
              console.log(`Sent ride request to driver ${driverId}`);
              
              // Thông báo cho người dùng rằng yêu cầu đã được gửi
              ws.send(JSON.stringify({
                type: "requestSent",
                requestId: requestId,
                message: "Yêu cầu chuyến đi đã được gửi đến tài xế, vui lòng đợi..."
              }));
            } else {
              ws.send(JSON.stringify({
                type: "requestFailed",
                message: "Tài xế không khả dụng, vui lòng thử lại"
              }));
            }
          }
        } else {
          ws.send(JSON.stringify({
            type: "requestFailed",
            message: "Tài xế không khả dụng, vui lòng chọn tài xế khác"
          }));
        }
      }

      // Xử lý khi tài xế chấp nhận chuyến đi
      if (data.type === "acceptRide" && data.role === "driver") {
        const requestId = data.requestId;
        const driverId = data.driverId;
        
        if (rideRequests[requestId] && rideRequests[requestId].status === "pending") {
          rideRequests[requestId].status = "accepted";
          
          // Cập nhật trạng thái tài xế
          if (drivers[driverId]) {
            drivers[driverId].status = "busy";
          }
          
          // Gửi thông báo cho người dùng
          const userWs = userConnections[rideRequests[requestId].userId];
          if (userWs && userWs.readyState === 1) {
            userWs.send(JSON.stringify({
              type: "rideAccepted",
              requestId: requestId,
              driverId: driverId,
              driverName: data.driverName || "Driver",
              driverPhoneNumber: data.phoneNumber || "Unknown",
              driverLocation: drivers[driverId],
              estimatedArrival: data.estimatedArrival || "10 phút"
            }));
            console.log(`Notified user about accepted ride ${requestId}`);
          }
        }
      }

      // Xử lý khi tài xế bắt đầu chuyến đi
      if (data.type === "startRide" && data.role === "driver") {
        const requestId = data.requestId;
        const rideId = data.rideId;
        const driverId = data.driverId;
        
        console.log(`[INFO] Driver ${driverId} started ride ${rideId} with request ${requestId}`);
        
        // Tìm user ID từ requestId hoặc các subscribers của tài xế
        let userId = null;
        if (rideRequests[requestId]) {
          userId = rideRequests[requestId].userId;
        } else if (driverLocationSubscribers[driverId]) {
          // Tìm từ danh sách người dùng đăng ký theo dõi tài xế này
          const subscriber = driverLocationSubscribers[driverId].find(sub => 
            (typeof sub === 'object' && sub.requestId === requestId)
          );
          if (subscriber) {
            userId = typeof subscriber === 'object' ? subscriber.userId : subscriber;
          }
        }
        
        if (userId) {
          console.log(`[INFO] Found user ${userId} for ride ${rideId}`);
          const userWs = userConnections[userId];
          if (userWs && userWs.readyState === 1) {
            // Gửi cả hai loại sự kiện để đảm bảo client nhận được
            // 1. Sự kiện startRide
            userWs.send(JSON.stringify({
              type: "startRide",
              requestId: requestId,
              rideId: rideId,
              driverId: driverId,
              status: "in_progress",
              estimatedArrival: data.estimatedArrival || "Đang di chuyển"
            }));
            
            // 2. Sự kiện rideStatusUpdate
            userWs.send(JSON.stringify({
              type: "rideStatusUpdate",
              requestId: requestId,
              rideId: rideId,
              status: "in_progress",
              message: "Chuyến đi đã bắt đầu",
              estimatedArrival: data.estimatedArrival || "Đang di chuyển"
            }));
            
            console.log(`[INFO] Sent ride start notifications to user ${userId}`);
          } else {
            console.log(`[WARNING] User ${userId} connection not available`);
          }
        } else {
          console.log(`[WARNING] Could not find user for ride ${rideId} with request ${requestId}`);
        }
      }

      // Xử lý khi tài xế từ chối chuyến đi
      if (data.type === "rejectRide" && data.role === "driver") {
        const requestId = data.requestId;
        
        if (rideRequests[requestId] && rideRequests[requestId].status === "pending") {
          // Gửi thông báo cho người dùng
          const userWs = userConnections[rideRequests[requestId].userId];
          if (userWs && userWs.readyState === 1) {
            userWs.send(JSON.stringify({
              type: "rideRejected",
              requestId: requestId,
              message: "Tài xế đã từ chối chuyến đi, vui lòng chọn tài xế khác"
            }));
          }
        }
      }

      // Xử lý khi tài xế hoàn thành chuyến đi
      if (data.type === "completeRide" && data.role === "driver") {
        const requestId = data.requestId;
        const driverId = data.driverId;
        
        if (rideRequests[requestId] && rideRequests[requestId].status === "accepted") {
          rideRequests[requestId].status = "completed";
          
          // Cập nhật trạng thái tài xế
          if (drivers[driverId]) {
            drivers[driverId].status = "available";
          }
          
          // Gửi thông báo cho người dùng
          const userWs = userConnections[rideRequests[requestId].userId];
          if (userWs && userWs.readyState === 1) {
            // Gửi một thông báo duy nhất về việc hoàn thành chuyến đi
            // Kết hợp các thông tin từ cả hai loại thông báo trước đây
            userWs.send(JSON.stringify({
              type: "rideCompleted",
              requestId: requestId,
              rideId: data.rideId,
              driverId: driverId,
              fare: data.fare || rideRequests[requestId].fare,
              status: "completed",
              message: "Chuyến đi đã hoàn thành"
            }));
            
            console.log(`Notified user about completed ride ${requestId}`);
          }
        }
      }
      
      // Xử lý khi người dùng hủy chuyến đi
      if (data.type === "cancelRideRequest" && data.role === "user") {
        const requestId = data.requestId;
        const driverId = data.driverId;
        
        if (rideRequests[requestId]) {
          rideRequests[requestId].status = "cancelled";
          
          // Thông báo cho tài xế
          const driverWs = driverConnections[driverId];
          if (driverWs && driverWs.readyState === 1) {
            driverWs.send(JSON.stringify({
              type: "rideCancelled",
              requestId: requestId,
              userId: data.userId,
              message: "Người dùng đã hủy chuyến đi"
            }));
          }
          
          // Xóa các đăng ký theo dõi vị trí
          if (driverLocationSubscribers[driverId]) {
            driverLocationSubscribers[driverId] = driverLocationSubscribers[driverId].filter(
              id => id !== data.userId
            );
          }
        }
      }
    } catch (error) {
      console.log("Failed to parse WebSocket message:", error);
    }
  });

  // Xử lý khi kết nối đóng
  ws.on("close", () => {
    if (driverId) {
      console.log(`Driver ${driverId} disconnected`);
      if (drivers[driverId]) {
        drivers[driverId].status = "offline";
      }
      delete driverConnections[driverId];
    }
    
    if (userId) {
      console.log(`User ${userId} disconnected`);
      delete userConnections[userId];
      
      // Xóa người dùng khỏi danh sách người theo dõi vị trí tài xế
      Object.keys(driverLocationSubscribers).forEach(driverId => {
        if (driverLocationSubscribers[driverId]) {
          driverLocationSubscribers[driverId] = driverLocationSubscribers[driverId].filter(
            id => id !== userId
          );
        }
      });
      
      // Hủy các yêu cầu chuyến đi đang chờ
      Object.keys(rideRequests).forEach(requestId => {
        if (rideRequests[requestId].userId === userId && rideRequests[requestId].status === "pending") {
          rideRequests[requestId].status = "cancelled";
          
          // Thông báo cho tài xế nếu yêu cầu đã được gửi
          const driverId = rideRequests[requestId].driverId;
          if (driverId && driverConnections[driverId] && driverConnections[driverId].readyState === 1) {
            driverConnections[driverId].send(JSON.stringify({
              type: "rideCancelled",
              requestId: requestId,
              message: "Người dùng đã hủy yêu cầu chuyến đi"
            }));
          }
        }
      });
    }
  });
});

const findNearbyDrivers = (userLat, userLon) => {
  return Object.entries(drivers)
    .filter(([id, location]) => {
      // Chỉ xem xét tài xế có trạng thái "available"
      if (location.status !== "available") return false;
      
      const distance = geolib.getDistance(
        { latitude: userLat, longitude: userLon },
        location
      );
      return distance <= 5000; // 5 kilometers
    })
    .map(([id, location]) => ({ 
      id, 
      ...location, 
      distance: geolib.getDistance(
        { latitude: userLat, longitude: userLon },
        location
      ) 
    }));
};

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

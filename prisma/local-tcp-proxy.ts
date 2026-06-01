import net from "net";
import tls from "tls";

const LOCAL_PORT = 5433;
const REMOTE_IP = "100.30.104.102"; // Geographically active, super-fast IPv4 address
const REMOTE_HOST = "ep-lucky-frog-aqe7ibwp.c-8.us-east-1.aws.neon.tech";
const REMOTE_PORT = 5432;

console.log(`Starting smart PostgreSQL TLS proxy on 127.0.0.1:${LOCAL_PORT}...`);

const server = net.createServer((localSocket) => {
  console.log("[PROXY] Local client connected!");
  
  let remoteSocket: tls.TLSSocket | null = null;
  let remoteConnected = false;
  let sslNegotiated = false;
  const clientBuffer: Buffer[] = [];
  
  // Register data listener IMMEDIATELY to prevent missing the client's first packet
  localSocket.on("data", (data) => {
    console.log(`[PROXY] Received ${data.length} bytes from client:`, data.toString("hex"));
    
    if (!remoteConnected || !remoteSocket || !remoteSocket.writable) {
      console.log("[PROXY] Remote connection not ready, buffering client data...");
      clientBuffer.push(data);
      return;
    }
    
    // Detect PostgreSQL SSLRequest (8 bytes: length 8, code 80877103)
    if (!sslNegotiated && data.length === 8 && data.readInt32BE(0) === 8 && data.readInt32BE(4) === 80877103) {
      console.log("[PROXY] Detected SSLRequest. Replying with 'N' (SSL Not Supported) locally...");
      sslNegotiated = true;
      localSocket.write("N");
    } else {
      sslNegotiated = true;
      remoteSocket.write(data);
    }
  });
  
  // Establish remote connection
  console.log(`[PROXY] Connecting to remote Neon DB over TLS at ${REMOTE_IP}:${REMOTE_PORT}...`);
  remoteSocket = tls.connect({
    port: REMOTE_PORT,
    host: REMOTE_IP,
    servername: REMOTE_HOST, // Crucial: Set SNI hostname for Neon routing
    rejectUnauthorized: false
  }, () => {
    console.log("[PROXY] Secure TLS connection to remote database established!");
    remoteConnected = true;
    
    // Flush any buffered client data
    if (clientBuffer.length > 0) {
      console.log(`[PROXY] Flushing ${clientBuffer.length} buffered chunks to remote...`);
      for (const chunk of clientBuffer) {
        if (!sslNegotiated && chunk.length === 8 && chunk.readInt32BE(0) === 8 && chunk.readInt32BE(4) === 80877103) {
          console.log("[PROXY] Detected buffered SSLRequest. Replying with 'N' locally...");
          sslNegotiated = true;
          localSocket.write("N");
        } else {
          sslNegotiated = true;
          remoteSocket!.write(chunk);
        }
      }
      clientBuffer.length = 0; // Clear buffer
    }
  });
  
  remoteSocket.on("data", (data) => {
    console.log(`[PROXY] Received ${data.length} bytes from remote DB:`, data.toString("hex").substring(0, 100));
    // Decrypted data from TLS is sent back as cleartext to local client
    localSocket.write(data);
  });
  
  remoteSocket.on("error", (remoteErr) => {
    console.error("[PROXY] Remote TLS socket error:", remoteErr.message);
    localSocket.destroy();
  });
  
  remoteSocket.on("error", (localErr) => {
    console.error("[PROXY] Local socket error:", localErr.message);
    if (remoteSocket) remoteSocket.destroy();
  });
  
  localSocket.on("close", () => {
    console.log("[PROXY] Local connection closed.");
    if (remoteSocket) remoteSocket.destroy();
  });
  
  remoteSocket.on("close", () => {
    console.log("[PROXY] Remote connection closed.");
    localSocket.destroy();
  });
});

server.listen(LOCAL_PORT, "127.0.0.1", () => {
  console.log(`[PROXY] Smart proxy successfully listening on 127.0.0.1:${LOCAL_PORT}`);
});

import { io } from 'socket.io-client'

// Single shared socket instance — connects once auth cookie is set.
// The server reads the httpOnly cookie automatically on the WS upgrade request.
const socket = io('/', { withCredentials: true, autoConnect: false })

export default socket
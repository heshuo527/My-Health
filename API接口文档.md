# 智能健康助手 - API接口文档

## 📖 项目概述

智能健康助手是一个集成多种API的前端健康咨询应用，主要使用以下API服务：

- **扣子(Coze) API**: 提供智能对话和健康咨询
- **讯飞语音API**: 提供语音合成功能
- **浏览器Web Speech API**: 提供语音识别和合成备用方案

## 🎯 API架构图

```
用户输入 → 健康助手前端 → 扣子API (对话) → 响应解析 → 讯飞/浏览器语音 → 用户输出
            ↑                                      ↓
      浏览器语音识别 ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← 语音播报
```

---

## 🤖 扣子(Coze) API

### 基本信息
- **基础URL**: `https://api.coze.cn/open_api/v2`
- **认证方式**: Bearer Token
- **请求格式**: JSON
- **响应格式**: JSON

### 1. 聊天对话接口

#### `POST /chat`

**功能**: 发送消息并获取AI回复

**请求头**:
```http
Content-Type: application/json
Authorization: Bearer YOUR_API_TOKEN
```

**请求参数**:
```json
{
  "bot_id": "你的机器人ID",
  "user": "health_user_1703123456789",
  "query": "帮我制定一份减肥计划",
  "chat_history": [
    {
      "role": "user",
      "content": "之前的用户消息"
    },
    {
      "role": "assistant", 
      "content": "之前的助手回复"
    }
  ],
  "stream": false
}
```

**响应格式**:
```json
{
  "code": 0,
  "msg": "success",
  "data": {
    "messages": [
      {
        "role": "assistant",
        "type": "answer",
        "content": "根据您的需求，我为您制定以下减肥计划...",
        "content_type": "text"
      },
      {
        "role": "assistant",
        "type": "follow_up",
        "content": "制定一份健康减肥的一周食谱",
        "content_type": "text"
      },
      {
        "role": "assistant",
        "type": "follow_up", 
        "content": "推荐一些适合减肥的运动",
        "content_type": "text"
      }
    ]
  }
}
```

**响应解析逻辑**:
```javascript
// 提取主要回答
const answerMessage = result.messages.find(msg => msg.type === 'answer');
const mainReply = answerMessage?.content || '';

// 提取后续建议
const followUps = result.messages.filter(msg => msg.type === 'follow_up');
const suggestions = followUps.map(msg => msg.content);

// 组合最终回复
let finalReply = mainReply;
if (suggestions.length > 0) {
    finalReply += '\n\n💡 相关问题：\n' + 
        suggestions.map((s, i) => `${i + 1}. ${s}`).join('\n');
}
```

**错误响应**:
```json
{
  "code": 4001,
  "msg": "Invalid bot_id",
  "data": null
}
```

### 常见错误码

| 错误码 | 说明 | 解决方案 |
|--------|------|----------|
| 4001 | Bot ID无效 | 检查Bot ID是否正确 |
| 4003 | API Token无效 | 检查Token是否正确且未过期 |
| 4029 | 请求过于频繁 | 降低请求频率 |
| 5000 | 服务器内部错误 | 稍后重试 |

---

## 🎵 讯飞语音API

### 基本信息
- **服务类型**: 语音合成(TTS)
- **音频格式**: MP3/WAV
- **采样率**: 16000Hz
- **认证方式**: API Key + App ID

### 1. 语音合成接口

#### `POST https://tts-api.xfyun.cn/v2/tts`

**功能**: 将文本转换为语音

**请求头**:
```http
Content-Type: application/json
```

**请求参数**:
```json
{
  "header": {
    "app_id": "你的应用ID",
    "status": 3
  },
  "parameter": {
    "tts": {
      "vcn": "xiaoyan",
      "speed": 50,
      "volume": 50,
      "pitch": 50,
      "bgs": 0,
      "tte": "UTF8",
      "reg": "2",
      "rdn": "0"
    }
  },
  "payload": {
    "text": {
      "encoding": "UTF8",
      "status": 2,
      "text": "需要合成的文本内容"
    }
  }
}
```

**响应格式**:
```json
{
  "header": {
    "code": 0,
    "message": "success",
    "sid": "tts000001"
  },
  "payload": {
    "audio": {
      "encoding": "lame",
      "sample_rate": "16000",
      "channels": "1",
      "bit_depth": "16",
      "frame_size": "1280",
      "audio": "base64编码的音频数据"
    }
  }
}
```

**JavaScript集成示例**:
```javascript
async function xunfeiTTS(text) {
    const payload = {
        header: {
            app_id: this.config.xunfei.appId,
            status: 3
        },
        parameter: {
            tts: {
                vcn: "xiaoyan",
                speed: 50,
                volume: 80,
                pitch: 50
            }
        },
        payload: {
            text: {
                encoding: "UTF8", 
                status: 2,
                text: btoa(unescape(encodeURIComponent(text)))
            }
        }
    };
    
    const response = await fetch('https://tts-api.xfyun.cn/v2/tts', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    });
    
    const result = await response.json();
    const audioData = result.payload.audio.audio;
    
    // 播放音频
    const audio = new Audio('data:audio/mp3;base64,' + audioData);
    audio.play();
}
```

---

## 🌐 浏览器Web Speech API

### 1. 语音识别 (Speech Recognition)

**功能**: 将语音转换为文本

**支持检测**:
```javascript
const isSupported = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
```

**基本用法**:
```javascript
function startSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    // 配置参数
    recognition.lang = 'zh-CN';              // 中文识别
    recognition.continuous = false;          // 单次识别
    recognition.interimResults = false;      // 不显示临时结果
    recognition.maxAlternatives = 1;         // 最大候选数
    
    // 事件监听
    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        const confidence = event.results[0][0].confidence;
        console.log('识别结果:', transcript, '置信度:', confidence);
    };
    
    recognition.onerror = (event) => {
        console.error('识别错误:', event.error);
    };
    
    recognition.onend = () => {
        console.log('识别结束');
    };
    
    // 开始识别
    recognition.start();
}
```

### 2. 语音合成 (Speech Synthesis)

**功能**: 将文本转换为语音

**支持检测**:
```javascript
const isSupported = 'speechSynthesis' in window;
```

**基本用法**:
```javascript
function browserSpeak(text) {
    if (!('speechSynthesis' in window)) {
        console.error('浏览器不支持语音合成');
        return;
    }
    
    // 停止当前播放
    speechSynthesis.cancel();
    
    // 创建语音实例
    const utterance = new SpeechSynthesisUtterance(text);
    
    // 配置参数
    utterance.lang = 'zh-CN';          // 中文
    utterance.rate = 0.9;              // 语速 (0.1-10)
    utterance.pitch = 1.0;             // 音调 (0-2)
    utterance.volume = 0.8;            // 音量 (0-1)
    
    // 获取中文声音
    const voices = speechSynthesis.getVoices();
    const chineseVoice = voices.find(voice => 
        voice.lang.includes('zh') || voice.name.includes('Chinese')
    );
    if (chineseVoice) {
        utterance.voice = chineseVoice;
    }
    
    // 事件监听
    utterance.onstart = () => console.log('开始播放');
    utterance.onend = () => console.log('播放结束');
    utterance.onerror = (e) => console.error('播放错误:', e);
    
    // 开始播放
    speechSynthesis.speak(utterance);
}
```

### 3. 媒体录音 (MediaRecorder)

**功能**: 录制用户语音

**基本用法**:
```javascript
async function startRecording() {
    try {
        // 获取麦克风权限
        const stream = await navigator.mediaDevices.getUserMedia({ 
            audio: {
                sampleRate: 16000,
                channelCount: 1,
                echoCancellation: true,
                noiseSuppression: true
            }
        });
        
        // 创建录音器
        const mediaRecorder = new MediaRecorder(stream);
        const audioChunks = [];
        
        // 事件监听
        mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                audioChunks.push(event.data);
            }
        };
        
        mediaRecorder.onstop = () => {
            // 生成音频Blob
            const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
            const audioUrl = URL.createObjectURL(audioBlob);
            
            // 处理录音数据
            processAudioData(audioBlob);
            
            // 停止媒体流
            stream.getTracks().forEach(track => track.stop());
        };
        
        // 开始录音
        mediaRecorder.start();
        
        return mediaRecorder;
    } catch (error) {
        console.error('录音失败:', error);
        throw error;
    }
}
```

---

## 🔧 错误处理策略

### 1. API调用失败处理

```javascript
async function callAPIWithFallback(apiCall, fallbackResponse) {
    try {
        const response = await apiCall();
        return response;
    } catch (error) {
        console.error('API调用失败:', error);
        
        // 使用备用回复
        if (typeof fallbackResponse === 'function') {
            return fallbackResponse();
        }
        return fallbackResponse;
    }
}
```

### 2. 网络超时处理

```javascript
function fetchWithTimeout(url, options, timeout = 10000) {
    return Promise.race([
        fetch(url, options),
        new Promise((_, reject) =>
            setTimeout(() => reject(new Error('请求超时')), timeout)
        )
    ]);
}
```

### 3. 语音功能降级

```javascript
async function speakText(text) {
    // 优先使用讯飞语音
    if (this.config.xunfei.appId) {
        try {
            await this.xunfeiTTS(text);
            return;
        } catch (error) {
            console.warn('讯飞语音失败，降级到浏览器语音');
        }
    }
    
    // 降级到浏览器语音
    this.browserSpeak(text);
}
```

---

## 📊 API调用统计

### 请求日志格式

```javascript
{
  timestamp: '2024-01-01T12:00:00.000Z',
  api: 'coze_chat',
  method: 'POST',
  url: 'https://api.coze.cn/open_api/v2/chat',
  status: 200,
  duration: 1250,
  request_size: 256,
  response_size: 1024,
  user_id: 'health_user_1703123456789',
  error: null
}
```

### 性能监控

```javascript
class APIMonitor {
    static logRequest(api, startTime, status, error = null) {
        const log = {
            timestamp: new Date().toISOString(),
            api: api,
            duration: Date.now() - startTime,
            status: status,
            error: error
        };
        
        console.log('API调用记录:', log);
        
        // 可以发送到监控服务
        // this.sendToMonitoring(log);
    }
}
```

---

## 🔑 配置管理

### 环境配置

```javascript
const CONFIG = {
    development: {
        coze: {
            baseUrl: 'https://api.coze.cn/open_api/v2',
            timeout: 10000
        },
        xunfei: {
            baseUrl: 'https://tts-api.xfyun.cn/v2/tts',
            timeout: 5000
        }
    },
    production: {
        coze: {
            baseUrl: 'https://api.coze.cn/open_api/v2',
            timeout: 15000
        },
        xunfei: {
            baseUrl: 'https://tts-api.xfyun.cn/v2/tts', 
            timeout: 8000
        }
    }
};
```

### 安全最佳实践

1. **API密钥管理**
   - 不要在前端代码中硬编码API密钥
   - 使用环境变量或安全存储
   - 定期轮换API密钥

2. **请求限制**
   - 实现请求频率限制
   - 设置合理的超时时间
   - 添加重试机制

3. **数据保护**
   - 不记录敏感用户数据
   - 使用HTTPS进行通信
   - 实现会话管理

---

## 📱 客户端集成示例

### React组件示例

```javascript
import React, { useState, useEffect } from 'react';

const HealthAssistant = () => {
    const [config, setConfig] = useState({
        coze: { botId: '', apiToken: '' },
        xunfei: { appId: '', apiKey: '' }
    });
    
    const [messages, setMessages] = useState([]);
    const [inputText, setInputText] = useState('');
    
    const sendMessage = async () => {
        if (!inputText.trim()) return;
        
        // 添加用户消息
        const userMessage = { role: 'user', content: inputText };
        setMessages(prev => [...prev, userMessage]);
        
        try {
            // 调用扣子API
            const response = await fetch('https://api.coze.cn/open_api/v2/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${config.coze.apiToken}`
                },
                body: JSON.stringify({
                    bot_id: config.coze.botId,
                    user: 'user_' + Date.now(),
                    query: inputText,
                    stream: false
                })
            });
            
            const result = await response.json();
            const reply = parseCozeResponse(result);
            
            // 添加助手回复
            const assistantMessage = { role: 'assistant', content: reply };
            setMessages(prev => [...prev, assistantMessage]);
            
            // 语音播报
            if (config.xunfei.appId) {
                speakText(reply);
            }
            
        } catch (error) {
            console.error('发送消息失败:', error);
        }
        
        setInputText('');
    };
    
    return (
        <div className="health-assistant">
            {/* 组件内容 */}
        </div>
    );
};
```

---

## 📞 技术支持

### 常见问题

1. **CORS跨域问题**
   - 问题：浏览器阻止跨域请求
   - 解决：使用代理服务器或服务端调用

2. **API调用频率限制**
   - 问题：请求过于频繁被限制
   - 解决：实现请求队列和频率控制

3. **语音功能不可用**
   - 问题：浏览器不支持或权限被拒绝
   - 解决：检查浏览器兼容性和权限设置

### 联系方式

- **技术文档**: 本文档
- **示例代码**: `health-assistant-simple.js`
- **配置说明**: `使用说明.md`

---

**更新时间**: 2024年1月
**版本**: v1.0.0
**维护者**: 智能健康助手开发团队 
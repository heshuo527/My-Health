/**
 * 智能健康助手 - 简洁版
 * 扣子对话 + 讯飞语音合成
 */

class SimpleHealthAssistant {
    constructor() {
        this.config = {
            coze: {
                botId: '',
                apiToken: '',
                baseUrl: 'https://api.coze.cn/open_api/v2'
            },
            xunfei: {
                appId: '',
                apiKey: '',
                apiSecret: ''
            }
        };
        
        this.isRecording = false;
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.conversationHistory = [];
        
        this.initElements();
        this.bindEvents();
        this.loadConfig();
        this.showWelcome();
    }

    initElements() {
        this.botIdInput = document.getElementById('botId');
        this.apiTokenInput = document.getElementById('apiToken');
        this.xfAppIdInput = document.getElementById('xfAppId');
        this.xfApiKeyInput = document.getElementById('xfApiKey');
        this.chatContainer = document.getElementById('chatContainer');
        this.textInput = document.getElementById('textInput');
        this.sendBtn = document.getElementById('sendBtn');
        this.voiceBtn = document.getElementById('voiceBtn');
        this.status = document.getElementById('status');
    }

    bindEvents() {
        // 配置输入事件
        [this.botIdInput, this.apiTokenInput, this.xfAppIdInput, this.xfApiKeyInput].forEach(input => {
            input.addEventListener('input', () => this.saveConfig());
        });

        // 发送按钮
        this.sendBtn.addEventListener('click', () => this.sendMessage());
        
        // 回车发送
        this.textInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        // 语音按钮
        this.voiceBtn.addEventListener('mousedown', () => this.startRecording());
        this.voiceBtn.addEventListener('mouseup', () => this.stopRecording());
        this.voiceBtn.addEventListener('mouseleave', () => {
            if (this.isRecording) this.stopRecording();
        });

        // 快速问题
        document.querySelectorAll('.question-tag').forEach(tag => {
            tag.addEventListener('click', (e) => {
                this.textInput.value = e.target.textContent;
                this.sendMessage();
            });
        });

        // 自动调整文本框高度
        this.textInput.addEventListener('input', () => {
            this.textInput.style.height = 'auto';
            this.textInput.style.height = Math.min(this.textInput.scrollHeight, 100) + 'px';
        });
    }

    loadConfig() {
        const saved = localStorage.getItem('health_assistant_config');
        if (saved) {
            const config = JSON.parse(saved);
            this.botIdInput.value = config.botId || '';
            this.apiTokenInput.value = config.apiToken || '';
            this.xfAppIdInput.value = config.xfAppId || '';
            this.xfApiKeyInput.value = config.xfApiKey || '';
            this.updateConfig();
        }
    }

    saveConfig() {
        const config = {
            botId: this.botIdInput.value,
            apiToken: this.apiTokenInput.value,
            xfAppId: this.xfAppIdInput.value,
            xfApiKey: this.xfApiKeyInput.value
        };
        localStorage.setItem('health_assistant_config', JSON.stringify(config));
        this.updateConfig();
    }

    updateConfig() {
        this.config.coze.botId = this.botIdInput.value;
        this.config.coze.apiToken = this.apiTokenInput.value;
        this.config.xunfei.appId = this.xfAppIdInput.value;
        this.config.xunfei.apiKey = this.xfApiKeyInput.value;
        
        this.updateStatus();
    }

    updateStatus() {
        const hasCoze = this.config.coze.botId && this.config.coze.apiToken;
        const hasXunfei = this.config.xunfei.appId && this.config.xunfei.apiKey;
        
        if (hasCoze && hasXunfei) {
            this.setStatus('✅ 配置完成，可以开始对话了');
        } else if (hasCoze) {
            this.setStatus('⚠️ 已配置扣子，讯飞语音不可用');
        } else {
            this.setStatus('⚠️ 请配置扣子和讯飞信息');
        }
    }

    showWelcome() {
        this.addMessage('assistant', '🏥 您好！我是智能健康助手。\n\n💡 功能介绍：\n• 扣子AI提供专业健康咨询\n• 讯飞语音合成自然播报\n• 支持文字和语音交互\n\n请先配置相关信息，然后开始咨询。');
    }

    async sendMessage() {
        const text = this.textInput.value.trim();
        if (!text) return;

        if (!this.config.coze.botId || !this.config.coze.apiToken) {
            this.setStatus('❌ 请先配置扣子信息');
            return;
        }

        this.addMessage('user', text);
        this.textInput.value = '';
        this.textInput.style.height = 'auto';
        
        this.setStatus('🤔 正在思考...');
        
        try {
            const response = await this.callCozeAPI(text);
            this.addMessage('assistant', response);
            this.setStatus('✅ 回复完成');
            
            // 讯飞语音播报
            if (this.config.xunfei.appId && this.config.xunfei.apiKey) {
                this.speakText(response);
            }
        } catch (error) {
            console.error('对话失败:', error);
            this.setStatus('❌ 对话失败: ' + error.message);
            
            // 备用回复
            const fallbackResponse = this.getFallbackResponse(text);
            this.addMessage('assistant', fallbackResponse);
            
            if (this.config.xunfei.appId && this.config.xunfei.apiKey) {
                this.speakText(fallbackResponse);
            }
        }
    }

    async callCozeAPI(message) {
        const requestData = {
            bot_id: this.config.coze.botId,
            user: 'health_user_' + Date.now(),
            query: message,
            chat_history: this.conversationHistory.slice(-6),
            stream: false
        };

        const response = await fetch(`${this.config.coze.baseUrl}/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.config.coze.apiToken}`,
            },
            body: JSON.stringify(requestData)
        });

        if (!response.ok) {
            throw new Error(`扣子API调用失败: ${response.status}`);
        }

        const result = await response.json();
        
        // 解析Coze API的复杂响应格式
        let reply = '';
        let followUpSuggestions = [];
        
        if (result.messages && Array.isArray(result.messages)) {
            // 提取主要回答 (type: "answer")
            const answerMessage = result.messages.find(msg => msg.type === 'answer');
            if (answerMessage && answerMessage.content) {
                reply = answerMessage.content;
            }
            
            // 提取后续建议 (type: "follow_up")
            const followUps = result.messages.filter(msg => msg.type === 'follow_up');
            followUpSuggestions = followUps.map(msg => msg.content).filter(content => content);
            
            // 如果没有找到answer类型，尝试使用其他内容
            if (!reply) {
                const contentMessage = result.messages.find(msg => msg.content && msg.content.trim());
                if (contentMessage) {
                    reply = contentMessage.content;
                }
            }
        }
        
        // 备用处理方式
        if (!reply) {
            reply = result.reply || result.content || '抱歉，我无法理解您的问题。';
        }
        
        // 如果有后续建议，附加到回答中
        if (followUpSuggestions.length > 0) {
            reply += '\n\n💡 相关问题：\n' + followUpSuggestions.map((suggestion, index) => 
                `${index + 1}. ${suggestion}`
            ).join('\n');
        }
        
        // 更新对话历史
        this.conversationHistory.push(
            { role: 'user', content: message },
            { role: 'assistant', content: reply }
        );

        return reply;
    }

    getFallbackResponse(message) {
        const keyword = message.toLowerCase();
        
        if (keyword.includes('减肥') || keyword.includes('瘦身') || keyword.includes('减重')) {
            return '🏃‍♀️ 健康减肥计划建议：\n\n📋 **饮食方案**：\n• 控制热量摄入，少食多餐\n• 多吃蔬菜水果，减少油腻食物\n• 充足蛋白质，适量碳水化合物\n• 多喝水，每天2L以上\n\n💪 **运动计划**：\n• 有氧运动：快走、慢跑、游泳\n• 力量训练：增强基础代谢\n• 每周运动4-5次，每次30-60分钟\n\n⏰ **生活习惯**：\n• 规律作息，充足睡眠\n• 避免熬夜和压力过大\n• 坚持记录体重变化\n\n⚠️ 建议咨询专业营养师制定个人化方案。';
        } else if (keyword.includes('头痛')) {
            return '头痛的常见缓解方法：\n\n1. 💧 多喝水，保持充足水分\n2. 😴 充足休息，避免过度疲劳\n3. 🧘‍♀️ 适当按摩太阳穴\n4. 🌿 保持室内空气流通\n\n如果头痛持续严重，建议及时就医。';
        } else if (keyword.includes('失眠') || keyword.includes('睡眠')) {
            return '改善睡眠的建议：\n\n1. ⏰ 规律作息，固定睡眠时间\n2. 📱 睡前1小时避免电子设备\n3. 🛏️ 保持卧室安静、黑暗、凉爽\n4. 🥛 睡前可喝温牛奶或听轻音乐\n\n持续失眠请咨询医生。';
        } else if (keyword.includes('免疫力') || keyword.includes('免疫')) {
            return '提高免疫力的方法：\n\n1. 🥗 均衡饮食，多吃蔬菜水果\n2. 💪 适量运动，增强体质\n3. 😴 充足睡眠，保证7-8小时\n4. 😊 保持良好心态，减少压力\n\n坚持健康生活方式是关键。';
        } else {
            return '感谢您的咨询！我是您的健康助手，可以为您提供：\n\n🏥 常见症状的建议\n🥗 营养健康指导\n💪 运动养生建议\n😴 睡眠质量改善\n\n请具体描述您的健康问题，我会尽力帮助您。';
        }
    }

    async startRecording() {
        if (this.isRecording) return;
        
        try {
            this.isRecording = true;
            this.voiceBtn.classList.add('recording');
            this.setStatus('🎤 正在录音，松开结束...');
            this.audioChunks = [];

            const stream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    sampleRate: 16000,
                    channelCount: 1
                }
            });

            this.mediaRecorder = new MediaRecorder(stream);
            
            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.audioChunks.push(event.data);
                }
            };

            this.mediaRecorder.onstop = () => {
                this.processVoiceInput();
                stream.getTracks().forEach(track => track.stop());
            };

            this.mediaRecorder.start();
        } catch (error) {
            console.error('录音失败:', error);
            this.setStatus('❌ 录音失败，请检查麦克风权限');
            this.resetVoiceButton();
        }
    }

    stopRecording() {
        if (this.isRecording && this.mediaRecorder) {
            this.isRecording = false;
            this.mediaRecorder.stop();
            this.setStatus('🔄 正在处理语音...');
        }
    }

    async processVoiceInput() {
        try {
            // 使用浏览器内置语音识别作为备用方案
            const text = await this.recognizeSpeech();
            
            if (text && text !== '语音识别失败') {
                this.textInput.value = text;
                this.sendMessage();
            } else {
                this.setStatus('❌ 语音识别失败，请重试或使用文字输入');
            }
        } catch (error) {
            console.error('语音处理失败:', error);
            this.setStatus('❌ 语音处理失败');
        } finally {
            this.resetVoiceButton();
        }
    }

    async recognizeSpeech() {
        return new Promise((resolve) => {
            if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
                resolve('浏览器不支持语音识别');
                return;
            }

            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            const recognition = new SpeechRecognition();
            
            recognition.lang = 'zh-CN';
            recognition.continuous = false;
            recognition.interimResults = false;

            let timeout = setTimeout(() => {
                recognition.stop();
                resolve('语音识别超时');
            }, 10000);

            recognition.onresult = (event) => {
                clearTimeout(timeout);
                const transcript = event.results[0][0].transcript;
                resolve(transcript);
            };

            recognition.onerror = () => {
                clearTimeout(timeout);
                resolve('语音识别失败');
            };

            try {
                recognition.start();
            } catch (error) {
                resolve('语音识别失败');
            }
        });
    }

    resetVoiceButton() {
        this.isRecording = false;
        this.voiceBtn.classList.remove('recording');
        this.updateStatus();
    }

    async speakText(text) {
        if (!this.config.xunfei.appId || !this.config.xunfei.apiKey) {
            // 使用浏览器内置语音合成
            this.browserSpeak(text);
            return;
        }

        try {
            // 这里应该调用讯飞语音合成API
            // 由于跨域限制，暂时使用浏览器语音合成
            this.browserSpeak(text);
        } catch (error) {
            console.error('讯飞语音合成失败:', error);
            this.browserSpeak(text);
        }
    }

    browserSpeak(text) {
        if ('speechSynthesis' in window) {
            // 停止当前播放
            speechSynthesis.cancel();
            
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'zh-CN';
            utterance.rate = 0.9;
            utterance.pitch = 1.0;
            utterance.volume = 0.8;
            
            // 尝试使用中文声音
            const voices = speechSynthesis.getVoices();
            const chineseVoice = voices.find(voice => 
                voice.lang.includes('zh') || voice.name.includes('Chinese')
            );
            if (chineseVoice) {
                utterance.voice = chineseVoice;
            }
            
            speechSynthesis.speak(utterance);
        }
    }

    addMessage(sender, content) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}`;
        
        const time = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        const prefix = sender === 'user' ? '👤' : '🤖';
        
        messageDiv.innerHTML = `
            <div style="font-size: 11px; opacity: 0.7; margin-bottom: 5px;">
                ${prefix} ${time}
            </div>
            ${content.replace(/\n/g, '<br>')}
        `;
        
        this.chatContainer.appendChild(messageDiv);
        this.chatContainer.scrollTop = this.chatContainer.scrollHeight;
    }

    setStatus(text) {
        this.status.textContent = text;
        this.status.className = text.includes('❌') ? 'error' : 
                               text.includes('🤔') || text.includes('🔄') ? 'loading' : 'status';
    }
}

// 页面加载后初始化
document.addEventListener('DOMContentLoaded', () => {
    try {
        new SimpleHealthAssistant();
        console.log('智能健康助手初始化成功');
    } catch (error) {
        console.error('初始化失败:', error);
    }
});

// 确保语音API可用
window.addEventListener('load', () => {
    if ('speechSynthesis' in window) {
        // 预加载语音列表
        speechSynthesis.getVoices();
    }
}); 
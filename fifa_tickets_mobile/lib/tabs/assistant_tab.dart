import 'package:flutter/material.dart';
import '../services/api_service.dart';

class AssistantTab extends StatefulWidget {
  const AssistantTab({super.key});

  @override
  State<AssistantTab> createState() => _AssistantTabState();
}

class _AssistantTabState extends State<AssistantTab> {
  final TextEditingController _messageController = TextEditingController();
  final ScrollController _scrollController = ScrollController();
  final List<Map<String, dynamic>> _messages = [
    {
      'text': '🤖 **Seat Guide Assistant:**\nI can help you navigate stadium layouts. Currently, your route suggests entry through Gate B. Make sure to have your digital pass scanned and checked at the gate. Let me know if you need to locate first aid or toilets!',
      'isUser': false,
    }
  ];
  bool _isTyping = false;

  Future<void> _sendMessage() async {
    final text = _messageController.text.trim();
    if (text.isEmpty) return;

    _messageController.clear();
    setState(() {
      _messages.add({'text': text, 'isUser': true});
      _isTyping = true;
    });
    _scrollToBottom();

    try {
      final responseText = await ApiService.sendChatMessage(text);
      if (!mounted) return;
      setState(() {
        _messages.add({'text': responseText, 'isUser': false});
        _isTyping = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _messages.add({
          'text': '🤖 **Seat Guide Assistant:**\nI\'m sorry, I\'m having trouble connecting to the chat service. Please verify the backend is running.',
          'isUser': false
        });
        _isTyping = false;
      });
    }
    _scrollToBottom();
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  // Parses basic markdown tags (**bold**) to RichText spans
  List<TextSpan> _parseMarkdown(String input) {
    final List<TextSpan> spans = [];
    final regExp = RegExp(r'\*\*(.*?)\*\*');
    int lastMatchEnd = 0;

    for (final match in regExp.allMatches(input)) {
      // Add text before bold match
      if (match.start > lastMatchEnd) {
        spans.add(TextSpan(
          text: input.substring(lastMatchEnd, match.start),
          style: const TextStyle(color: Colors.white, fontSize: 14, height: 1.4),
        ));
      }
      // Add bold text
      spans.add(TextSpan(
        text: match.group(1),
        style: const TextStyle(
          color: Colors.white,
          fontWeight: FontWeight.bold,
          fontSize: 14,
          height: 1.4,
        ),
      ));
      lastMatchEnd = match.end;
    }

    // Add trailing text
    if (lastMatchEnd < input.length) {
      spans.add(TextSpan(
        text: input.substring(lastMatchEnd),
        style: const TextStyle(color: Colors.white, fontSize: 14, height: 1.4),
      ));
    }

    return spans;
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        // Message thread
        Expanded(
          child: ListView.builder(
            controller: _scrollController,
            padding: const EdgeInsets.all(16),
            itemCount: _messages.length,
            itemBuilder: (context, index) {
              final msg = _messages[index];
              final isUser = msg['isUser'] as bool;

              return Align(
                alignment: isUser ? Alignment.centerRight : Alignment.centerLeft,
                child: Container(
                  constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.8),
                  margin: const EdgeInsets.only(bottom: 16),
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  decoration: BoxDecoration(
                    color: isUser
                        ? const Color(0xFFFFE259).withOpacity(0.15)
                        : const Color(0xFF0D1524).withOpacity(0.7),
                    borderRadius: BorderRadius.only(
                      topLeft: const Radius.circular(16),
                      topRight: const Radius.circular(16),
                      bottomLeft: isUser ? const Radius.circular(16) : Radius.zero,
                      bottomRight: isUser ? Radius.zero : const Radius.circular(16),
                    ),
                    border: Border.all(
                      color: isUser
                          ? const Color(0xFFFFE259).withOpacity(0.4)
                          : const Color(0xFF1E2D4A).withOpacity(0.5),
                    ),
                  ),
                  child: RichText(
                    text: TextSpan(
                      children: _parseMarkdown(msg['text'] as String),
                    ),
                  ),
                ),
              );
            },
          ),
        ),

        // Typing indicator
        if (_isTyping)
          Padding(
            padding: const EdgeInsets.only(left: 16, bottom: 8),
            child: Align(
              alignment: Alignment.centerLeft,
              child: Row(
                children: [
                  const SizedBox(
                    width: 10,
                    height: 10,
                    child: CircularProgressIndicator(
                      strokeWidth: 1.5,
                      color: Color(0xFFFFE259),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Text(
                    'Guide is processing response...',
                    style: TextStyle(fontSize: 11, color: Colors.white.withOpacity(0.3)),
                  )
                ],
              ),
            ),
          ),

        // Text input field
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: const Color(0xFF070B14),
            border: Border.all(color: const Color(0xFF1E2D4A)),
          ),
          child: SafeArea(
            top: false,
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _messageController,
                    style: const TextStyle(color: Colors.white, fontSize: 14),
                    onSubmitted: (_) => _sendMessage(),
                    decoration: InputDecoration(
                      hintText: 'Ask about toilets, food, elevators...',
                      hintStyle: const TextStyle(color: Colors.white24, fontSize: 13),
                      filled: true,
                      fillColor: const Color(0xFF0D1524),
                      contentPadding:
                          const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                      enabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(24),
                        borderSide: const BorderSide(color: Color(0xFF1E2D4A)),
                      ),
                      focusedBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(24),
                        borderSide: const BorderSide(color: Color(0xFFFFE259)),
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 10),
                GestureDetector(
                  onTap: _sendMessage,
                  child: Container(
                    padding: const EdgeInsets.all(10),
                    decoration: const BoxDecoration(
                      shape: BoxShape.circle,
                      gradient: LinearGradient(
                        colors: [Color(0xFFFFE259), Color(0xFFFFA751)],
                      ),
                    ),
                    child: const Icon(
                      Icons.send,
                      color: Colors.black,
                      size: 18,
                    ),
                  ),
                )
              ],
            ),
          ),
        ),
      ],
    );
  }
}

import 'dart:convert';
import 'package:http/http.dart' as http;

class ApiService {
  // Configurable base URL. Defaulting to localhost:8000 for standard run.
  // Note: For Android Emulator, use http://10.0.2.2:8000
  static String baseUrl = 'http://localhost:8000';

  // 1. Fetch matches
  static Future<List<dynamic>> fetchMatches() async {
    try {
      final response = await http.get(Uri.parse('$baseUrl/api/matches'));
      if (response.statusCode == 200) {
        return jsonDecode(response.body) as List<dynamic>;
      } else {
        throw Exception('Failed to load matches: ${response.statusCode}');
      }
    } catch (e) {
      print('Error in fetchMatches: $e');
      rethrow;
    }
  }

  // 2. Fetch booked tickets
  static Future<List<dynamic>> fetchTickets() async {
    try {
      final response = await http.get(Uri.parse('$baseUrl/api/tickets'));
      if (response.statusCode == 200) {
        return jsonDecode(response.body) as List<dynamic>;
      } else {
        throw Exception('Failed to load tickets: ${response.statusCode}');
      }
    } catch (e) {
      print('Error in fetchTickets: $e');
      rethrow;
    }
  }

  // 3. Complete booking checkout
  static Future<Map<String, dynamic>> createBooking({
    required String matchId,
    required String holderName,
    required int category,
    required int qty,
  }) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/api/bookings'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'matchId': matchId,
          'holderName': holderName,
          'category': category,
          'qty': qty,
        }),
      );

      if (response.statusCode == 201) {
        return jsonDecode(response.body) as Map<String, dynamic>;
      } else {
        final errBody = jsonDecode(response.body);
        throw Exception(errBody['error'] ?? 'Booking failed');
      }
    } catch (e) {
      print('Error in createBooking: $e');
      rethrow;
    }
  }

  // 4. Verify ticket serial
  static Future<Map<String, dynamic>> verifyTicket(String serial) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/api/tickets/verify'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'serial': serial}),
      );

      if (response.statusCode == 200 || response.statusCode == 404) {
        return jsonDecode(response.body) as Map<String, dynamic>;
      } else {
        throw Exception('Verification request failed');
      }
    } catch (e) {
      print('Error in verifyTicket: $e');
      rethrow;
    }
  }

  // 5. Send message to assistant chatbot
  static Future<String> sendChatMessage(String message) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/api/chat'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'message': message}),
      );

      if (response.statusCode == 200) {
        final resObj = jsonDecode(response.body) as Map<String, dynamic>;
        return resObj['response'] ?? 'Assistant is unresponsive';
      } else {
        throw Exception('Chat service failed');
      }
    } catch (e) {
      print('Error in sendChatMessage: $e');
      rethrow;
    }
  }
}

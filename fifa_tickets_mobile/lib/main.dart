import 'package:flutter/material.dart';
import 'services/api_service.dart';
import 'tabs/booking_tab.dart';
import 'tabs/wallet_tab.dart';
import 'tabs/pathfinder_tab.dart';
import 'tabs/assistant_tab.dart';

void main() {
  runApp(const FifaPassApp());
}

class FifaPassApp extends StatelessWidget {
  const FifaPassApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'FIFA Pass 26',
      debugShowCheckedModeBanner: false,
      theme: ThemeData.dark().copyWith(
        scaffoldBackgroundColor: const Color(0xFF03060A),
        colorScheme: const ColorScheme.dark(
          primary: Color(0xFFFFE259),
          secondary: Color(0xFFFFA751),
          surface: Color(0xFF0D1524),
        ),
        appBarTheme: const AppBarTheme(
          backgroundColor: Color(0xFF070B14),
          elevation: 0,
        ),
      ),
      home: const MainLayout(),
    );
  }
}

class MainLayout extends StatefulWidget {
  const MainLayout({super.key});

  @override
  State<MainLayout> createState() => _MainLayoutState();
}

class _MainLayoutState extends State<MainLayout> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  List<dynamic> _bookedTickets = [];
  int? _activeTicketIndex;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 4, vsync: this);
    _loadTicketsData();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _loadTicketsData() async {
    setState(() {
      _isLoading = true;
    });
    try {
      final tickets = await ApiService.fetchTickets();
      setState(() {
        _bookedTickets = tickets;
        if (tickets.isNotEmpty) {
          _activeTicketIndex = 0;
        } else {
          _activeTicketIndex = null;
        }
        _isLoading = false;
      });
    } catch (e) {
      print('Error loading tickets: $e');
      setState(() {
        _isLoading = false;
      });
    }
  }

  void _onBookingSuccess() async {
    // Reload ticket details from database
    await _loadTicketsData();
    // Switch to Wallet Tab (Index 1)
    setState(() {
      _activeTicketIndex = _bookedTickets.length - 1;
    });
    _tabController.animateTo(1);
  }

  void _onLocateSeat() {
    // Switch to Seat Pathfinder Tab (Index 2)
    _tabController.animateTo(2);
  }

  void _showIpConfigDialog() {
    final TextEditingController controller =
        TextEditingController(text: ApiService.baseUrl);

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Configure Backend IP'),
        backgroundColor: const Color(0xFF0D1524),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Enter server host URL (default localhost:8000).\nFor Android Emulator, use http://10.0.2.2:8000',
              style: TextStyle(fontSize: 12, color: Colors.white60),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: controller,
              style: const TextStyle(color: Colors.white),
              decoration: InputDecoration(
                filled: true,
                fillColor: const Color(0xFF070B14),
                enabledBorder: OutlineInputBorder(
                  borderSide: const BorderSide(color: Color(0xFF1E2D4A)),
                  borderRadius: BorderRadius.circular(8),
                ),
                focusedBorder: OutlineInputBorder(
                  borderSide: const BorderSide(color: Color(0xFFFFE259)),
                  borderRadius: BorderRadius.circular(8),
                ),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel', style: TextStyle(color: Colors.white54)),
          ),
          ElevatedButton(
            onPressed: () {
              final newUrl = controller.text.trim();
              if (newUrl.isNotEmpty) {
                setState(() {
                  ApiService.baseUrl = newUrl;
                });
                Navigator.pop(context);
                _loadTicketsData(); // Retry loader
              }
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFFFFE259),
              foregroundColor: Colors.black,
            ),
            child: const Text('Save & Reload'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Row(
          children: [
            Container(
              width: 32,
              height: 32,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: const LinearGradient(
                  colors: [Color(0xFFFFE259), Color(0xFFFFA751)],
                ),
                border: Border.all(color: Colors.white24),
              ),
              child: const Icon(Icons.sports_soccer, color: Colors.black, size: 20),
            ),
            const SizedBox(width: 10),
            RichText(
              text: const TextSpan(
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.w900),
                children: [
                  TextSpan(text: 'FIFA', style: TextStyle(color: Colors.white)),
                  TextSpan(text: 'Pass 26', style: TextStyle(color: Color(0xFFFFE259))),
                ],
              ),
            ),
          ],
        ),
        actions: [
          IconButton(
            onPressed: _showIpConfigDialog,
            icon: const Icon(Icons.settings_ethernet, color: Color(0xFFFFE259)),
            tooltip: 'Configure Backend IP',
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: Color(0xFFFFE259)))
          : TabBarView(
              controller: _tabController,
              children: [
                BookingTab(onBookingSuccess: _onBookingSuccess),
                WalletTab(
                  bookedTickets: _bookedTickets,
                  activeTicketIndex: _activeTicketIndex,
                  onSelectTicket: (index) {
                    setState(() {
                      _activeTicketIndex = index;
                    });
                  },
                  onRefresh: _loadTicketsData,
                  onLocateSeat: _onLocateSeat,
                ),
                PathfinderTab(
                  bookedTickets: _bookedTickets,
                  activeTicketIndex: _activeTicketIndex,
                ),
                const AssistantTab(),
              ],
            ),
      bottomNavigationBar: Container(
        decoration: const BoxDecoration(
          border: Border(
            top: BorderSide(color: Color(0xFF1E2D4A), width: 1),
          ),
        ),
        child: BottomAppBar(
          color: const Color(0xFF070B14),
          child: TabBar(
            controller: _tabController,
            indicatorColor: const Color(0xFFFFE259),
            labelColor: const Color(0xFFFFE259),
            unselectedLabelColor: Colors.white38,
            labelStyle: const TextStyle(fontSize: 9, fontWeight: FontWeight.bold),
            tabs: [
              Tab(
                icon: const Icon(Icons.local_play_outlined),
                text: 'Book Tickets',
              ),
              Tab(
                icon: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(Icons.wallet_outlined),
                    if (_bookedTickets.isNotEmpty) ...[
                      const SizedBox(width: 4),
                      Container(
                        padding: const EdgeInsets.all(3),
                        decoration: const BoxDecoration(
                          color: Color(0xFFFFE259),
                          shape: BoxShape.circle,
                        ),
                        child: Text(
                          _bookedTickets.length.toString(),
                          style: const TextStyle(
                            fontSize: 8,
                            color: Colors.black,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      )
                    ]
                  ],
                ),
                text: 'My Tickets',
              ),
              Tab(
                icon: const Icon(Icons.map_outlined),
                text: 'Pathfinder',
              ),
              Tab(
                icon: const Icon(Icons.chat_bubble_outline),
                text: 'Assistant',
              ),
            ],
          ),
        ),
      ),
    );
  }
}

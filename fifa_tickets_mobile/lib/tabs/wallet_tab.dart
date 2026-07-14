import 'package:flutter/material.dart';
import '../services/api_service.dart';

class WalletTab extends StatefulWidget {
  final List<dynamic> bookedTickets;
  final int? activeTicketIndex;
  final Function(int) onSelectTicket;
  final VoidCallback onRefresh;
  final VoidCallback onLocateSeat;

  const WalletTab({
    super.key,
    required this.bookedTickets,
    required this.activeTicketIndex,
    required this.onSelectTicket,
    required this.onRefresh,
    required this.onLocateSeat,
  });

  @override
  State<WalletTab> createState() => _WalletTabState();
}

class _WalletTabState extends State<WalletTab> with SingleTickerProviderStateMixin {
  bool _isScanning = false;
  int _scanStep = 0; // 0: init, 1: crypto, 2: capacity, 3: granted, 4: denied
  String _scanStatusText = '';
  
  // Scanning animation controller for the green laser line
  late AnimationController _animationController;
  late Animation<double> _laserAnimation;

  @override
  void initState() {
    super.initState();
    _animationController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 2),
    );
    _laserAnimation = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(parent: _animationController, curve: Curves.easeInOut),
    );
  }

  @override
  void dispose() {
    _animationController.dispose();
    super.dispose();
  }

  void _startScanning(Map<String, dynamic> ticket) async {
    setState(() {
      _isScanning = true;
      _scanStep = 0;
      _scanStatusText = 'INITIATING AI SECURITY TRIAGE...';
    });
    _animationController.repeat(reverse: true);

    try {
      // API call to verify ticket on the backend
      final verification = await ApiService.verifyTicket(ticket['serial']);
      final bool isVerified = verification['verified'] ?? false;

      // Simulate Step 1 (1000ms)
      await Future.delayed(const Duration(milliseconds: 1000));
      if (!mounted) return;
      setState(() {
        _scanStep = 1;
        _scanStatusText = 'AUTHENTICATING SECURITY CRYPTO...';
      });

      // Simulate Step 2 (1000ms)
      await Future.delayed(const Duration(milliseconds: 1000));
      if (!mounted) return;
      setState(() {
        _scanStep = 2;
        _scanStatusText = 'VALIDATING CAPACITY SYNC...';
      });

      // Simulate Step 3 (1000ms) - Grant or Deny access
      await Future.delayed(const Duration(milliseconds: 1000));
      if (!mounted) return;
      _animationController.stop();

      setState(() {
        if (isVerified) {
          _scanStep = 3;
          _scanStatusText = 'ACCESS GRANTED! GATE VERIFIED.';
        } else {
          _scanStep = 4;
          _scanStatusText = 'ACCESS DENIED! INVALID TICKET.';
        }
      });
    } catch (e) {
      if (!mounted) return;
      _animationController.stop();
      setState(() {
        _scanStep = 4;
        _scanStatusText = 'VERIFICATION ERROR! OFFLINE MODE.';
      });
    }
  }

  Widget _buildCheckItem(String label, bool isChecked) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        children: [
          AnimatedContainer(
            duration: const Duration(milliseconds: 300),
            width: 18,
            height: 18,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: isChecked ? Colors.green : const Color(0xFF1E2D4A),
              border: Border.all(
                color: isChecked ? Colors.green : Colors.white24,
              ),
            ),
            child: isChecked
                ? const Icon(Icons.check, size: 12, color: Colors.black)
                : const SizedBox(),
          ),
          const SizedBox(width: 12),
          Text(
            label,
            style: TextStyle(
              color: isChecked ? Colors.white : Colors.white30,
              fontSize: 13,
              fontWeight: isChecked ? FontWeight.w600 : FontWeight.normal,
            ),
          )
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (widget.bookedTickets.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.wallet, size: 80, color: Colors.white24),
            const SizedBox(height: 16),
            const Text(
              'No active tickets booked',
              style: TextStyle(color: Colors.white54, fontSize: 16),
            ),
            const SizedBox(height: 24),
            ElevatedButton(
              onPressed: widget.onRefresh,
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF1E2D4A),
                foregroundColor: Colors.white,
              ),
              child: const Text('Refresh Wallet'),
            )
          ],
        ),
      );
    }

    final activeT = widget.bookedTickets[widget.activeTicketIndex ?? 0];

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header refresh
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'Digital Wallet Pass',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color: Colors.white,
                ),
              ),
              IconButton(
                onPressed: widget.onRefresh,
                icon: const Icon(Icons.refresh, color: Colors.white70),
              )
            ],
          ),
          const SizedBox(height: 12),

          // Tickets list horizontal selector
          SizedBox(
            height: 70,
            child: ListView.builder(
              scrollDirection: Axis.horizontal,
              itemCount: widget.bookedTickets.length,
              itemBuilder: (context, index) {
                final t = widget.bookedTickets[index];
                final isActive = index == widget.activeTicketIndex;

                return GestureDetector(
                  onTap: () => widget.onSelectTicket(index),
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 200),
                    margin: const EdgeInsets.only(right: 12),
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                    decoration: BoxDecoration(
                      color: isActive
                          ? const Color(0xFF162035).withOpacity(0.9)
                          : const Color(0xFF0D1524).withOpacity(0.6),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                        color: isActive
                            ? const Color(0xFFFFE259).withOpacity(0.8)
                            : const Color(0xFF1E2D4A).withOpacity(0.4),
                        width: isActive ? 2 : 1,
                      ),
                    ),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          '${t['team1']} VS ${t['team2']}',
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.bold,
                            color: isActive ? Colors.white : Colors.white70,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'Sec ${t['sec']}',
                          style: const TextStyle(fontSize: 11, color: Colors.white38),
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
          ),

          const SizedBox(height: 20),

          // Ticket stub Card
          _buildTicketStub(activeT),

          const SizedBox(height: 20),

          // Scanner overlay or controls
          if (_isScanning) _buildScannerPanel(activeT) else _buildActionControls(activeT),
        ],
      ),
    );
  }

  Widget _buildTicketStub(Map<String, dynamic> t) {
    return Container(
      decoration: BoxDecoration(
        color: const Color(0xFF0C101A),
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: const Color(0xFF1E2D4A), width: 1.5),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.3),
            blurRadius: 15,
            spreadRadius: 2,
          )
        ],
      ),
      child: Column(
        children: [
          // Top Part (Stadium details & flags)
          Container(
            padding: const EdgeInsets.all(24),
            child: Column(
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: const Color(0xFFFFE259).withOpacity(0.15),
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Text(
                        t['level'].toString().toUpperCase(),
                        style: const TextStyle(
                          color: Color(0xFFFFE259),
                          fontSize: 10,
                          fontWeight: FontWeight.w800,
                          letterSpacing: 1.0,
                        ),
                      ),
                    ),
                    const Icon(Icons.shield, color: Colors.greenAccent, size: 16),
                  ],
                ),
                const SizedBox(height: 20),
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Image.network(t['team1Flag'], width: 36, height: 24),
                    const SizedBox(width: 12),
                    Text(
                      t['team1'],
                      style: const TextStyle(
                        fontSize: 22,
                        fontWeight: FontWeight.w900,
                        color: Colors.white,
                      ),
                    ),
                    const Padding(
                      padding: EdgeInsets.symmetric(horizontal: 16),
                      child: Text(
                        'VS',
                        style: TextStyle(
                          fontSize: 14,
                          color: Color(0xFFFFA751),
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                    Text(
                      t['team2'],
                      style: const TextStyle(
                        fontSize: 22,
                        fontWeight: FontWeight.w900,
                        color: Colors.white,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Image.network(t['team2Flag'], width: 36, height: 24),
                  ],
                ),
                const SizedBox(height: 20),
                Text(
                  t['stadium'].toString().toUpperCase(),
                  style: const TextStyle(
                    fontSize: 13,
                    color: Colors.white70,
                    fontWeight: FontWeight.w600,
                    letterSpacing: 0.5,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  t['datetime'],
                  style: const TextStyle(fontSize: 12, color: Colors.white38),
                ),
              ],
            ),
          ),

          // Dashed Divider line
          Row(
            children: List.generate(
              30,
              (index) => Expanded(
                child: Container(
                  height: 1.5,
                  margin: const EdgeInsets.symmetric(horizontal: 2),
                  color: index.isEven ? const Color(0xFF1E2D4A) : Colors.transparent,
                ),
              ),
            ),
          ),

          // Bottom Part (Ticket metadata & simulated barcode)
          Container(
            padding: const EdgeInsets.all(24),
            child: Column(
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    _buildTicketMetaItem('TICKET HOLDER', t['holder']),
                    _buildTicketMetaItem('GATE', 'GATE ${t['gate']}'),
                  ],
                ),
                const SizedBox(height: 16),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    _buildTicketMetaItem('SECTION', t['sec'].toString().replaceAll('Section ', '')),
                    _buildTicketMetaItem('ROW', t['row'].toString()),
                    _buildTicketMetaItem('SEAT', t['seat'].toString()),
                  ],
                ),
                const SizedBox(height: 28),

                // Simulated Barcode
                Container(
                  height: 45,
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.03),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: Colors.white24),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: List.generate(40, (index) {
                      // Generate varying barcode widths
                      final double width = (index % 4 == 0) ? 3.0 : (index % 3 == 0) ? 1.0 : 2.0;
                      final bool isGap = index % 5 == 1;

                      return Container(
                        width: isGap ? 2 : width,
                        margin: const EdgeInsets.symmetric(horizontal: 0.5),
                        color: isGap ? Colors.transparent : Colors.white70,
                      );
                    }),
                  ),
                ),
                const SizedBox(height: 10),
                Text(
                  t['serial'],
                  style: const TextStyle(
                    fontSize: 10,
                    fontFamily: 'monospace',
                    color: Colors.white30,
                    letterSpacing: 1.5,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTicketMetaItem(String label, String value) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: const TextStyle(
            fontSize: 9,
            fontWeight: FontWeight.bold,
            color: Colors.white30,
            letterSpacing: 1.0,
          ),
        ),
        const SizedBox(height: 4),
        Text(
          value,
          style: const TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w700,
            color: Colors.white,
          ),
        ),
      ],
    );
  }

  Widget _buildActionControls(Map<String, dynamic> ticket) {
    return Column(
      children: [
        SizedBox(
          width: double.infinity,
          height: 46,
          child: ElevatedButton.icon(
            onPressed: () => _startScanning(ticket),
            icon: const Icon(Icons.qr_code_scanner, size: 18),
            label: const Text('Scan & Verify at Gate'),
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF1E2D4A),
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
                side: const BorderSide(color: Color(0xFF2C436F)),
              ),
            ),
          ),
        ),
        const SizedBox(height: 12),
        SizedBox(
          width: double.infinity,
          height: 46,
          child: ElevatedButton.icon(
            onPressed: widget.onLocateSeat,
            icon: const Icon(Icons.map_outlined, size: 18),
            label: const Text('Trace Path to Seat'),
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.transparent,
              foregroundColor: const Color(0xFFFFE259),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
                side: const BorderSide(color: Color(0xFFFFE259), width: 1.5),
              ),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildScannerPanel(Map<String, dynamic> ticket) {
    final statusColor = (_scanStep == 3)
        ? Colors.greenAccent
        : (_scanStep == 4)
            ? Colors.redAccent
            : const Color(0xFFFFE259);

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: const Color(0xFF0F1524),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFF1E2D4A)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              SizedBox(
                width: 14,
                height: 14,
                child: CircularProgressIndicator(
                  strokeWidth: 2,
                  color: statusColor,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  _scanStatusText,
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.bold,
                    color: statusColor,
                    letterSpacing: 0.5,
                  ),
                ),
              ),
              if (_scanStep >= 3)
                TextButton(
                  onPressed: () {
                    setState(() {
                      _isScanning = false;
                    });
                  },
                  child: const Text('Close', style: TextStyle(color: Colors.white70)),
                )
            ],
          ),
          const SizedBox(height: 16),
          _buildCheckItem('Authenticating Crypto Ticket Code', _scanStep >= 1),
          _buildCheckItem('${ticket['stadium']} capacity check sync', _scanStep >= 2),
          _buildCheckItem('Formatting stadium entry gate routing directions', _scanStep >= 3),
        ],
      ),
    );
  }
}

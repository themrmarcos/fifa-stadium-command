import 'package:flutter/material.dart';
import '../services/api_service.dart';

class BookingTab extends StatefulWidget {
  final VoidCallback onBookingSuccess;

  const BookingTab({super.key, required this.onBookingSuccess});

  @override
  State<BookingTab> createState() => _BookingTabState();
}

class _BookingTabState extends State<BookingTab> {
  List<dynamic> _matches = [];
  bool _isLoading = true;
  String? _errorMsg;

  String? _selectedMatchId;
  final TextEditingController _holderController = TextEditingController();
  int _selectedCategory = 1; // 1, 2, 3
  int _selectedQty = 1;

  @override
  void initState() {
    super.initState();
    _loadMatches();
  }

  Future<void> _loadMatches() async {
    setState(() {
      _isLoading = true;
      _errorMsg = null;
    });
    try {
      final matches = await ApiService.fetchMatches();
      setState(() {
        _matches = matches;
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _errorMsg = 'Could not load matches. Ensure backend is running.';
        _isLoading = false;
      });
    }
  }

  void _selectMatch(String id) {
    setState(() {
      _selectedMatchId = id;
    });
  }

  double _getCategoryPrice(int cat) {
    if (cat == 1) return 380.00;
    if (cat == 2) return 240.00;
    return 120.00;
  }

  String _getCategoryName(int cat) {
    if (cat == 1) return 'Cat 1 - Pitchside';
    if (cat == 2) return 'Cat 2 - Middle Tier';
    return 'Cat 3 - Upper Deck';
  }

  Future<void> _processBooking(Map<String, dynamic> match) async {
    final holderName = _holderController.text.trim();
    if (holderName.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please enter ticket holder name.'),
          backgroundColor: Colors.redAccent,
        ),
      );
      return;
    }

    try {
      showDialog(
        context: context,
        barrierDismissible: false,
        builder: (context) => const Center(
          child: CircularProgressIndicator(color: Color(0xFFFFE259)),
        ),
      );

      await ApiService.createBooking(
        matchId: match['id'],
        holderName: holderName,
        category: _selectedCategory,
        qty: _selectedQty,
      );

      // Close loading dialog
      if (mounted) Navigator.pop(context);

      // Show success message
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Ticket Booked Successfully!'),
            backgroundColor: Colors.green,
          ),
        );
      }

      // Reset state
      setState(() {
        _selectedMatchId = null;
        _holderController.clear();
        _selectedCategory = 1;
        _selectedQty = 1;
      });

      // Reload matches and notify parent
      _loadMatches();
      widget.onBookingSuccess();
    } catch (e) {
      if (mounted) Navigator.pop(context); // Close loading dialog
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error: ${e.toString().replaceAll('Exception: ', '')}'),
            backgroundColor: Colors.redAccent,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Center(
        child: CircularProgressIndicator(color: Color(0xFFFFE259)),
      );
    }

    if (_errorMsg != null) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.error_outline, size: 60, color: Colors.red[300]),
            const SizedBox(height: 16),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24),
              child: Text(
                _errorMsg!,
                textAlign: TextAlign.center,
                style: const TextStyle(color: Colors.white70, fontSize: 16),
              ),
            ),
            const SizedBox(height: 24),
            ElevatedButton.icon(
              onPressed: _loadMatches,
              icon: const Icon(Icons.refresh),
              label: const Text('Retry Connection'),
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFFFFA751),
                foregroundColor: Colors.black,
              ),
            )
          ],
        ),
      );
    }

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Select World Cup Match',
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.bold,
              color: Colors.white,
              letterSpacing: 0.5,
            ),
          ),
          const SizedBox(height: 12),

          // Matches grid
          ListView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: _matches.length,
            itemBuilder: (context, index) {
              final m = _matches[index];
              final isSelected = m['id'] == _selectedMatchId;
              final isLowTickets = m['ticketsLeft'] <= 10;

              return GestureDetector(
                onTap: () => _selectMatch(m['id']),
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 200),
                  margin: const EdgeInsets.only(bottom: 12),
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: isSelected
                        ? const Color(0xFF162035).withOpacity(0.9)
                        : const Color(0xFF0D1524).withOpacity(0.8),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(
                      color: isSelected
                          ? const Color(0xFFFFE259).withOpacity(0.8)
                          : const Color(0xFF1E2D4A).withOpacity(0.4),
                      width: isSelected ? 2 : 1,
                    ),
                    boxShadow: isSelected
                        ? [
                            BoxShadow(
                              color: const Color(0xFFFFE259).withOpacity(0.15),
                              blurRadius: 10,
                              spreadRadius: 1,
                            )
                          ]
                        : [],
                  ),
                  child: Row(
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              m['group'].toUpperCase(),
                              style: TextStyle(
                                fontSize: 10,
                                fontWeight: FontWeight.w800,
                                color: isSelected
                                    ? const Color(0xFFFFE259)
                                    : Colors.white38,
                                letterSpacing: 1.0,
                              ),
                            ),
                            const SizedBox(height: 6),
                            Row(
                              children: [
                                Image.network(m['team1Flag'], width: 24, height: 16),
                                const SizedBox(width: 8),
                                Text(
                                  m['team1'],
                                  style: const TextStyle(
                                    fontSize: 16,
                                    fontWeight: FontWeight.bold,
                                    color: Colors.white,
                                  ),
                                ),
                                const Padding(
                                  padding: EdgeInsets.symmetric(horizontal: 8),
                                  child: Text(
                                    'VS',
                                    style: TextStyle(
                                      fontSize: 12,
                                      color: Color(0xFFFFE259),
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                ),
                                Image.network(m['team2Flag'], width: 24, height: 16),
                                const SizedBox(width: 8),
                                Text(
                                  m['team2'],
                                  style: const TextStyle(
                                    fontSize: 16,
                                    fontWeight: FontWeight.bold,
                                    color: Colors.white,
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 8),
                            Row(
                              children: [
                                const Icon(Icons.location_on,
                                    size: 14, color: Colors.white54),
                                const SizedBox(width: 4),
                                Expanded(
                                  child: Text(
                                    '${m['stadium']} (${m['location']})',
                                    style: const TextStyle(
                                      fontSize: 12,
                                      color: Colors.white54,
                                    ),
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          if (isLowTickets)
                            Row(
                              children: [
                                const Icon(Icons.local_fire_department,
                                    color: Colors.redAccent, size: 14),
                                const SizedBox(width: 2),
                                Text(
                                  'Only ${m['ticketsLeft']} left!',
                                  style: const TextStyle(
                                    fontSize: 11,
                                    color: Colors.redAccent,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ],
                            )
                          else
                            Text(
                              '${m['ticketsLeft']} available',
                              style: const TextStyle(
                                fontSize: 11,
                                color: Colors.greenAccent,
                              ),
                            ),
                          const SizedBox(height: 6),
                          Text(
                            '${m['date']}\n${m['time']}',
                            textAlign: TextAlign.right,
                            style: const TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w500,
                              color: Colors.white70,
                            ),
                          ),
                        ],
                      )
                    ],
                  ),
                ),
              );
            },
          ),

          const SizedBox(height: 16),

          // Checkout container
          if (_selectedMatchId != null) ...[
            const Divider(color: Color(0xFF1E2D4A), height: 32),
            _buildCheckoutPanel(),
          ],
        ],
      ),
    );
  }

  Widget _buildCheckoutPanel() {
    final match = _matches.firstWhere((m) => m['id'] == _selectedMatchId);
    final double basePrice = _getCategoryPrice(_selectedCategory);
    final double subtotal = basePrice * _selectedQty;
    final double total = subtotal + 15.00; // Fees

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: const Color(0xFF070B14).withOpacity(0.9),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: const Color(0xFF1E2D4A),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.shopping_bag_outlined, color: Color(0xFFFFE259), size: 22),
              const SizedBox(width: 8),
              Text(
                'Checkout: ${match['team1']} vs. ${match['team2']}',
                style: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                  color: Colors.white,
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),

          // Holder Name input
          const Text(
            'TICKET HOLDER NAME',
            style: TextStyle(
              fontSize: 10,
              fontWeight: FontWeight.bold,
              color: Colors.white38,
              letterSpacing: 1.0,
            ),
          ),
          const SizedBox(height: 6),
          TextField(
            controller: _holderController,
            style: const TextStyle(color: Colors.white),
            decoration: InputDecoration(
              hintText: 'e.g. Alex Morgan',
              hintStyle: const TextStyle(color: Colors.white24),
              filled: true,
              fillColor: const Color(0xFF0D1524),
              contentPadding:
                  const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: const BorderSide(color: Color(0xFF1E2D4A)),
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: const BorderSide(color: Color(0xFFFFE259)),
              ),
            ),
          ),

          const SizedBox(height: 20),

          // Seating Category
          const Text(
            'SEATING CATEGORY',
            style: TextStyle(
              fontSize: 10,
              fontWeight: FontWeight.bold,
              color: Colors.white38,
              letterSpacing: 1.0,
            ),
          ),
          const SizedBox(height: 8),
          Column(
            children: [1, 2, 3].map((cat) {
              final catName = _getCategoryName(cat);
              final catPrice = _getCategoryPrice(cat);
              return RadioListTile<int>(
                value: cat,
                groupValue: _selectedCategory,
                activeColor: const Color(0xFFFFE259),
                title: Text(
                  catName,
                  style: const TextStyle(color: Colors.white, fontSize: 14),
                ),
                secondary: Text(
                  '\$${catPrice.toStringAsFixed(0)}',
                  style: const TextStyle(
                    color: Color(0xFFFFE259),
                    fontWeight: FontWeight.bold,
                    fontSize: 15,
                  ),
                ),
                onChanged: (val) {
                  setState(() {
                    _selectedCategory = val!;
                  });
                },
                contentPadding: EdgeInsets.zero,
              );
            }).toList(),
          ),

          const SizedBox(height: 16),

          // Quantity dropdown
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'TICKET QUANTITY',
                style: TextStyle(
                  fontSize: 10,
                  fontWeight: FontWeight.bold,
                  color: Colors.white38,
                  letterSpacing: 1.0,
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12),
                decoration: BoxDecoration(
                  color: const Color(0xFF0D1524),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: const Color(0xFF1E2D4A)),
                ),
                child: DropdownButton<int>(
                  value: _selectedQty,
                  dropdownColor: const Color(0xFF0D1524),
                  underline: const SizedBox(),
                  style: const TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.bold,
                  ),
                  icon: const Icon(Icons.arrow_drop_down, color: Colors.white54),
                  items: [1, 2, 3, 4, 5].map((int val) {
                    return DropdownMenuItem<int>(
                      value: val,
                      child: Text('  $val Tickets  '),
                    );
                  }).toList(),
                  onChanged: (val) {
                    setState(() {
                      _selectedQty = val!;
                    });
                  },
                ),
              ),
            ],
          ),

          const SizedBox(height: 24),
          const Divider(color: Color(0xFF1E2D4A), height: 1),
          const SizedBox(height: 16),

          // Summary details
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                '${_getCategoryName(_selectedCategory)} x $_selectedQty',
                style: const TextStyle(color: Colors.white70, fontSize: 13),
              ),
              Text(
                '\$${subtotal.toStringAsFixed(2)}',
                style: const TextStyle(color: Colors.white, fontSize: 13),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: const [
              Text(
                'Booking & Security Fees',
                style: TextStyle(color: Colors.white38, fontSize: 12),
              ),
              Text(
                '\$15.00',
                style: TextStyle(color: Colors.white38, fontSize: 12),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'Total Amount',
                style: TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.bold,
                  fontSize: 15,
                ),
              ),
              Text(
                '\$${total.toStringAsFixed(2)}',
                style: const TextStyle(
                  color: Color(0xFFFFE259),
                  fontWeight: FontWeight.w900,
                  fontSize: 18,
                ),
              ),
            ],
          ),

          const SizedBox(height: 24),

          // Submit button
          SizedBox(
            width: double.infinity,
            height: 48,
            child: Container(
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(12),
                gradient: const LinearGradient(
                  colors: [Color(0xFFFFE259), Color(0xFFFFA751)],
                ),
              ),
              child: ElevatedButton(
                onPressed: () => _processBooking(match),
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.transparent,
                  shadowColor: Colors.transparent,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
                child: const Text(
                  'Book & Generate Ticket',
                  style: TextStyle(
                    color: Colors.black,
                    fontWeight: FontWeight.w800,
                    fontSize: 14,
                    letterSpacing: 0.5,
                  ),
                ),
              ),
            ),
          )
        ],
      ),
    );
  }
}

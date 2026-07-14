import 'dart:math' as math;
import 'package:flutter/material.dart';

class PathfinderTab extends StatefulWidget {
  final List<dynamic> bookedTickets;
  final int? activeTicketIndex;

  const PathfinderTab({
    super.key,
    required this.bookedTickets,
    required this.activeTicketIndex,
  });

  @override
  State<PathfinderTab> createState() => _PathfinderTabState();
}

class _PathfinderTabState extends State<PathfinderTab> with SingleTickerProviderStateMixin {
  String _selectedGate = 'A';
  String _selectedSector = 'North';
  int _activeCategoryNum = 1; // 1: Field, 2: Club, 3: Upper

  bool _isPathTraced = false;
  late AnimationController _pathController;
  late Animation<double> _pathProgress;

  @override
  void initState() {
    super.initState();
    _pathController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1500),
    );
    _pathProgress = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(parent: _pathController, curve: Curves.easeInOut),
    );

    _autofillFromActiveTicket();
  }

  @override
  void didUpdateWidget(covariant PathfinderTab oldWidget) {
    super.didUpdateWidget(oldWidget);
    _autofillFromActiveTicket();
  }

  @override
  void dispose() {
    _pathController.dispose();
    super.dispose();
  }

  void _autofillFromActiveTicket() {
    if (widget.bookedTickets.isNotEmpty && widget.activeTicketIndex != null) {
      final activeT = widget.bookedTickets[widget.activeTicketIndex!];
      setState(() {
        _selectedGate = activeT['gate'] ?? 'A';
        _selectedSector = activeT['sector'] ?? 'North';
        _activeCategoryNum = activeT['catNum'] ?? 1;
      });
    }
  }

  void _tracePath() {
    setState(() {
      _isPathTraced = true;
    });
    _pathController.reset();
    _pathController.forward();
    
    // Auto-select category view based on sector if no active ticket
    if (widget.bookedTickets.isEmpty) {
      setState(() {
        if (_selectedSector == 'North') _activeCategoryNum = 1;
        if (_selectedSector == 'East') _activeCategoryNum = 2;
        if (_selectedSector == 'South') _activeCategoryNum = 3;
        if (_selectedSector == 'West') _activeCategoryNum = 1;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Interactive Seat Pathfinder',
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.bold,
              color: Colors.white,
            ),
          ),
          const SizedBox(height: 12),

          // Selection form panel
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: const Color(0xFF0D1524).withOpacity(0.8),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: const Color(0xFF1E2D4A)),
            ),
            child: Column(
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'SELECT ENTRY GATE',
                            style: TextStyle(fontSize: 9, color: Colors.white38, fontWeight: FontWeight.bold),
                          ),
                          const SizedBox(height: 6),
                          _buildDropdown(
                            value: _selectedGate,
                            items: ['A', 'B', 'C', 'D'],
                            onChanged: (val) {
                              setState(() {
                                _selectedGate = val!;
                                _isPathTraced = false;
                              });
                            },
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'SELECT SECTOR',
                            style: TextStyle(fontSize: 9, color: Colors.white38, fontWeight: FontWeight.bold),
                          ),
                          const SizedBox(height: 6),
                          _buildDropdown(
                            value: _selectedSector,
                            items: ['North', 'East', 'South', 'West'],
                            onChanged: (val) {
                              setState(() {
                                _selectedSector = val!;
                                _isPathTraced = false;
                              });
                            },
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                SizedBox(
                  width: double.infinity,
                  height: 40,
                  child: ElevatedButton(
                    onPressed: _tracePath,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFFFFE259),
                      foregroundColor: Colors.black,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(8),
                      ),
                    ),
                    child: const Text(
                      'Trace Navigation Path',
                      style: TextStyle(fontWeight: FontWeight.bold),
                    ),
                  ),
                ),
              ],
            ),
          ),

          const SizedBox(height: 20),

          // Stadium Map Custom Paint container
          Container(
            height: 280,
            width: double.infinity,
            decoration: BoxDecoration(
              color: const Color(0xFF070B14),
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: const Color(0xFF1E2D4A)),
            ),
            child: Stack(
              children: [
                // Render Stadium Painter
                Positioned.fill(
                  child: AnimatedBuilder(
                    animation: _pathProgress,
                    builder: (context, child) {
                      return CustomPaint(
                        painter: StadiumMapPainter(
                          gate: _selectedGate,
                          sector: _selectedSector,
                          isPathTraced: _isPathTraced,
                          pathProgress: _pathProgress.value,
                        ),
                      );
                    },
                  ),
                ),
                // Indicator label overlay
                Positioned(
                  top: 12,
                  left: 12,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: _isPathTraced ? Colors.green.withOpacity(0.2) : Colors.white10,
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(
                        color: _isPathTraced ? Colors.green : Colors.white24,
                      ),
                    ),
                    child: Text(
                      _isPathTraced
                          ? 'Gate $_selectedGate ➔ Section $_selectedSector'
                          : 'Select gate & section',
                      style: TextStyle(
                        fontSize: 11,
                        color: _isPathTraced ? Colors.greenAccent : Colors.white70,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                )
              ],
            ),
          ),

          const SizedBox(height: 20),

          // Telemetry and 3D View angle title
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                '3D Seating Angle Preview',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                  color: Colors.white,
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: const Color(0xFF1E2D4A),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(
                  _activeCategoryNum == 1
                      ? 'Category 1 View'
                      : _activeCategoryNum == 2
                          ? 'Category 2 View'
                          : 'Category 3 View',
                  style: const TextStyle(
                    fontSize: 10,
                    color: Color(0xFFFFE259),
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),

          // 3D Perspective Custom Paint container
          Container(
            height: 200,
            width: double.infinity,
            decoration: BoxDecoration(
              color: const Color(0xFF03060a),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: const Color(0xFF1E2D4A)),
            ),
            child: CustomPaint(
              painter: Pitch3DPainter(category: _activeCategoryNum),
            ),
          ),
          const SizedBox(height: 12),

          // Telemetry details footer
          Row(
            children: [
              _buildTelemetryItem(
                'DISTANCE TO PITCH',
                _activeCategoryNum == 1
                    ? '14 meters'
                    : _activeCategoryNum == 2
                        ? '38 meters'
                        : '75 meters',
              ),
              const SizedBox(width: 16),
              _buildTelemetryItem(
                'ELEVATION ANGLE',
                _activeCategoryNum == 1
                    ? '7° (Field Level)'
                    : _activeCategoryNum == 2
                        ? '22° (Middle Tier)'
                        : '44° (Upper Deck)',
              ),
            ],
          )
        ],
      ),
    );
  }

  Widget _buildDropdown({
    required String value,
    required List<String> items,
    required ValueChanged<String?> onChanged,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12),
      decoration: BoxDecoration(
        color: const Color(0xFF070B14),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: const Color(0xFF1E2D4A)),
      ),
      child: DropdownButtonHideUnderline(
        child: DropdownButton<String>(
          value: value,
          dropdownColor: const Color(0xFF070B14),
          isExpanded: true,
          style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600, fontSize: 14),
          icon: const Icon(Icons.arrow_drop_down, color: Colors.white70),
          items: items.map((String item) {
            return DropdownMenuItem<String>(
              value: item,
              child: Text(item),
            );
          }).toList(),
          onChanged: onChanged,
        ),
      ),
    );
  }

  Widget _buildTelemetryItem(String label, String value) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: const Color(0xFF0D1524).withOpacity(0.5),
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: const Color(0xFF1E2D4A).withOpacity(0.4)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              label,
              style: const TextStyle(fontSize: 8, color: Colors.white30, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 4),
            Text(
              value,
              style: const TextStyle(fontSize: 13, color: Colors.white, fontWeight: FontWeight.bold),
            ),
          ],
        ),
      ),
    );
  }
}

// === Custom Stadium Map Vector Painter ===
class StadiumMapPainter extends CustomPainter {
  final String gate;
  final String sector;
  final bool isPathTraced;
  final double pathProgress;

  StadiumMapPainter({
    required this.gate,
    required this.sector,
    required this.isPathTraced,
    required this.pathProgress,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final stadiumRadius = size.height * 0.4;
    final pitchWidth = stadiumRadius * 0.8;
    final pitchHeight = stadiumRadius * 0.55;

    // Paints
    final fieldBorderPaint = Paint()
      ..color = const Color(0xFF1E2D4A)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.5;

    final sectorPaint = Paint()
      ..color = const Color(0xFF162035).withOpacity(0.4)
      ..style = PaintingStyle.fill;

    final sectorHighlightPaint = Paint()
      ..color = const Color(0xFFFFD700).withOpacity(0.15)
      ..style = PaintingStyle.fill;

    final sectorBorderPaint = Paint()
      ..color = const Color(0xFF1E2D4A).withOpacity(0.5)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.0;

    final sectorHighlightBorderPaint = Paint()
      ..color = const Color(0xFFFFE259)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2.0;

    // Draw Outer Stadium Stand boundaries (divided into 4 segments: N, E, S, W)
    final rect = Rect.fromCircle(center: center, radius: stadiumRadius);

    // North Sector Segment (Start Angle: 225, Sweep: 90)
    canvas.drawArc(rect, 5 * math.pi / 4, math.pi / 2, true, sector == 'North' ? sectorHighlightPaint : sectorPaint);
    canvas.drawArc(rect, 5 * math.pi / 4, math.pi / 2, true, sector == 'North' ? sectorHighlightBorderPaint : sectorBorderPaint);

    // East Sector Segment (Start Angle: 315, Sweep: 90)
    canvas.drawArc(rect, 7 * math.pi / 4, math.pi / 2, true, sector == 'East' ? sectorHighlightPaint : sectorPaint);
    canvas.drawArc(rect, 7 * math.pi / 4, math.pi / 2, true, sector == 'East' ? sectorHighlightBorderPaint : sectorBorderPaint);

    // South Sector Segment (Start Angle: 45, Sweep: 90)
    canvas.drawArc(rect, math.pi / 4, math.pi / 2, true, sector == 'South' ? sectorHighlightPaint : sectorPaint);
    canvas.drawArc(rect, math.pi / 4, math.pi / 2, true, sector == 'South' ? sectorHighlightBorderPaint : sectorBorderPaint);

    // West Sector Segment (Start Angle: 135, Sweep: 90)
    canvas.drawArc(rect, 3 * math.pi / 4, math.pi / 2, true, sector == 'West' ? sectorHighlightPaint : sectorPaint);
    canvas.drawArc(rect, 3 * math.pi / 4, math.pi / 2, true, sector == 'West' ? sectorHighlightBorderPaint : sectorBorderPaint);

    // Cover Center with Inner Stadium Bowl pitch cutout
    final innerBowlPaint = Paint()
      ..color = const Color(0xFF070B14)
      ..style = PaintingStyle.fill;
    canvas.drawCircle(center, stadiumRadius * 0.7, innerBowlPaint);
    canvas.drawCircle(center, stadiumRadius * 0.7, fieldBorderPaint);

    // Draw Small Pitch Green field in the center
    final pitchRect = Rect.fromCenter(center: center, width: pitchWidth, height: pitchHeight);
    final pitchPaint = Paint()
      ..color = const Color(0xFF0F3825).withOpacity(0.6)
      ..style = PaintingStyle.fill;
    final pitchBorder = Paint()
      ..color = const Color(0xFF00E676).withOpacity(0.3)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.0;
    canvas.drawRect(pitchRect, pitchPaint);
    canvas.drawRect(pitchRect, pitchBorder);

    // Coordinates mapping for Gates and Sectors
    final Map<String, Offset> gates = {
      'A': Offset(center.dx, center.dy - stadiumRadius - 10), // North gate
      'B': Offset(center.dx + stadiumRadius + 10, center.dy), // East gate
      'C': Offset(center.dx, center.dy + stadiumRadius + 10), // South gate
      'D': Offset(center.dx - stadiumRadius - 10, center.dy), // West gate
    };

    final Map<String, Offset> sectors = {
      'North': Offset(center.dx, center.dy - stadiumRadius * 0.55),
      'East': Offset(center.dx + stadiumRadius * 0.55, center.dy),
      'South': Offset(center.dx, center.dy + stadiumRadius * 0.55),
      'West': Offset(center.dx - stadiumRadius * 0.55, center.dy),
    };

    // Draw Gate Nodes
    gates.forEach((name, pos) {
      final isGateSelected = name == gate;
      final gatePaint = Paint()
        ..color = isGateSelected ? const Color(0xFFFFD700) : const Color(0xFF1E2D4A)
        ..style = PaintingStyle.fill;
      canvas.drawCircle(pos, 8, gatePaint);

      // Gate Text label
      final textPainter = TextPainter(
        text: TextSpan(
          text: name,
          style: TextStyle(
            color: isGateSelected ? Colors.black : Colors.white70,
            fontSize: 9,
            fontWeight: FontWeight.bold,
          ),
        ),
        textDirection: TextDirection.ltr,
      )..layout();
      textPainter.paint(canvas, Offset(pos.dx - textPainter.width / 2, pos.dy - textPainter.height / 2));
    });

    // Draw dynamic route path from selected Gate to Seating Sector
    if (isPathTraced) {
      final start = gates[gate]!;
      final end = sectors[sector]!;
      
      // Control midpoint for curved route Q (quadratic bezier)
      final midPoint = Offset(center.dx, center.dy);

      final path = Path()
        ..moveTo(start.dx, start.dy)
        ..quadraticBezierTo(midPoint.dx, midPoint.dy, end.dx, end.dy);

      // Glow paint behind route line
      final glowPaint = Paint()
        ..color = const Color(0xFF00E676).withOpacity(0.3)
        ..style = PaintingStyle.stroke
        ..strokeWidth = 6.0
        ..strokeCap = StrokeCap.round;

      // Primary neon route line
      final pathPaint = Paint()
        ..color = const Color(0xFF00E676)
        ..style = PaintingStyle.stroke
        ..strokeWidth = 2.5
        ..strokeCap = StrokeCap.round;

      // Extract properties of the path to animate the progress line
      final pathMetrics = path.computeMetrics().first;
      final extractPath = pathMetrics.extractPath(0.0, pathMetrics.length * pathProgress);
      
      canvas.drawPath(extractPath, glowPaint);
      canvas.drawPath(extractPath, pathPaint);

      // Draw sliding dot marker along path
      final tangent = pathMetrics.getTangentForOffset(pathMetrics.length * pathProgress);
      if (tangent != null) {
        final dotGlow = Paint()
          ..color = const Color(0xFF00E676).withOpacity(0.5)
          ..style = PaintingStyle.fill;
        final dotPaint = Paint()
          ..color = Colors.white
          ..style = PaintingStyle.fill;

        canvas.drawCircle(tangent.position, 8.0 * pathProgress, dotGlow);
        canvas.drawCircle(tangent.position, 4.0 * pathProgress, dotPaint);
      }
    }
  }

  @override
  bool shouldRepaint(covariant StadiumMapPainter oldDelegate) {
    return oldDelegate.gate != gate ||
        oldDelegate.sector != sector ||
        oldDelegate.isPathTraced != isPathTraced ||
        oldDelegate.pathProgress != pathProgress;
  }
}

// === Custom 3D perspective pitch drawing ===
class Pitch3DPainter extends CustomPainter {
  final int category;

  Pitch3DPainter({required this.category});

  @override
  void paint(Canvas canvas, Size size) {
    // Horizon positioning and scaling variables based on Category selection
    double horizonY;
    double scaleFactor;
    if (category == 1) {
      horizonY = size.height * 0.45;
      scaleFactor = 1.0;
    } else if (category == 2) {
      horizonY = size.height * 0.3;
      scaleFactor = 0.65;
    } else {
      horizonY = size.height * 0.15;
      scaleFactor = 0.35;
    }

    // Sky background (stands stands silhouette)
    final standsPaint = Paint()
      ..shader = LinearGradient(
        colors: [const Color(0xFF101726), const Color(0xFF080c14)],
        begin: Alignment.topCenter,
        end: Alignment.bottomCenter,
      ).createShader(Rect.fromLTRB(0, horizonY - 45, size.width, horizonY));
    canvas.drawRect(Rect.fromLTRB(0, horizonY - 45, size.width, horizonY), standsPaint);

    // Draw seating crowd dots simulation
    final dotPaint = Paint()..color = Colors.white.withOpacity(0.06);
    final random = math.Random(12);
    for (int i = 0; i < 40; i++) {
      canvas.drawCircle(
        Offset(random.nextDouble() * size.width, horizonY - 10 - random.nextDouble() * 30),
        1.5,
        dotPaint,
      );
    }

    // Draw Pitch Field Perspective (Emerald Green Trapezoid)
    final pitchPath = Path();
    final hzX1 = size.width / 2 - 120 * scaleFactor;
    final hzX2 = size.width / 2 + 120 * scaleFactor;
    const fgX1 = -80.0;
    final fgX2 = size.width + 80.0;

    pitchPath.moveTo(hzX1, horizonY);
    pitchPath.lineTo(hzX2, horizonY);
    pitchPath.lineTo(fgX2, size.height);
    pitchPath.lineTo(fgX1, size.height);
    pitchPath.close();

    final fieldPaint = Paint()
      ..shader = LinearGradient(
        colors: [const Color(0xFF0f3825), const Color(0xFF00E676)],
        begin: Alignment.topCenter,
        end: Alignment.bottomCenter,
      ).createShader(Rect.fromLTRB(0, horizonY, size.width, size.height));
    canvas.drawPath(pitchPath, fieldPaint);

    // Draw Pitch markings in perspective
    final markPaint = Paint()
      ..color = Colors.white.withOpacity(0.4)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.5;

    // Center dividing line
    canvas.drawLine(
      Offset(size.width / 2, horizonY),
      Offset(size.width / 2, size.height),
      markPaint,
    );

    // Center circle (draw ellipse in perspective)
    final ellipseRect = Rect.fromCenter(
      center: Offset(size.width / 2, horizonY + (size.height - horizonY) / 2),
      width: 120 * scaleFactor,
      height: 60 * scaleFactor,
    );
    canvas.drawOval(ellipseRect, markPaint);

    // Goal Post structure facing the viewer
    final goalPaint = Paint()
      ..color = Colors.white
      ..style = PaintingStyle.stroke
      ..strokeWidth = 3;

    final goalWidth = 140 * scaleFactor;
    final goalHeight = 70 * scaleFactor;
    final goalX = size.width / 2 - goalWidth / 2;
    final goalY = horizonY + 30 * scaleFactor;

    canvas.drawRect(Rect.fromLTWH(goalX, goalY, goalWidth, goalHeight), goalPaint);
    canvas.drawRect(
      Rect.fromLTWH(goalX, goalY, goalWidth, goalHeight),
      Paint()..color = Colors.white.withOpacity(0.06),
    );

    // Draw soccer ball on the field
    final ballY = horizonY + (size.height - horizonY) * 0.75;
    const ballXOffset = 15;
    final ballSize = 6 * scaleFactor;
    
    // Ball Shadow
    canvas.drawOval(
      Rect.fromCenter(
        center: Offset(size.width / 2 + ballXOffset, ballY + ballSize - 1),
        width: ballSize * 2,
        height: 4,
      ),
      Paint()..color = Colors.black.withOpacity(0.5),
    );
    
    // Ball Body
    canvas.drawCircle(
      Offset(size.width / 2 + ballXOffset, ballY),
      ballSize,
      Paint()..color = Colors.white,
    );
  }

  @override
  bool shouldRepaint(covariant Pitch3DPainter oldDelegate) {
    return oldDelegate.category != category;
  }
}

# FIFA 2026 Ticket Seating Pathfinder API Specifications

This document outlines the schema, methods, endpoints, query payloads, and expected response codes for the FIFA 2026 full-stack REST API.

---

## 🗺️ 1. Client / Fan API Endpoints

### GET `/api/matches`
Fetches a list of all active matches scheduled at MetLife and BC Place.
- **Method**: `GET`
- **Response Code**: `200 OK`
- **Response Format**: `JSON Array`
- **JSON Structure**:
  ```json
  [
    {
      "id": "m1",
      "team1": "USA",
      "team2": "MEX",
      "team1Flag": "https://flagcdn.com/w80/us.png",
      "team2Flag": "https://flagcdn.com/w80/mx.png",
      "stadium": "MetLife Stadium",
      "datetime": "June 12, 2026 • 20:00",
      "group": "Group A Match 1",
      "ticketsLeft": 249
    }
  ]
  ```

---

### GET `/api/tickets`
Fetches all tickets registered or booked in the database system.
- **Method**: `GET`
- **Response Code**: `200 OK`
- **Response Format**: `JSON Array`

---

### POST `/api/bookings`
Allocates a ticket seat for a specific match, decrements available capacity, and registers a ticket stub.
- **Method**: `POST`
- **Content-Type**: `application/json`
- **Request Body Payload**:
  ```json
  {
    "matchId": "m1",
    "holder": "Jane Doe",
    "level": "Category 1",
    "catNum": 1,
    "sec": "East 104",
    "row": 5,
    "seat": 12
  }
  ```
- **Response Code**: `201 Created`
- **Response Body Format**: `JSON Object`
- **JSON Structure**:
  ```json
  {
    "matchId": "m1",
    "team1": "USA",
    "team2": "MEX",
    "team1Flag": "https://flagcdn.com/w80/us.png",
    "team2Flag": "https://flagcdn.com/w80/mx.png",
    "stadium": "MetLife Stadium",
    "datetime": "June 12, 2026 • 20:00",
    "holder": "Jane Doe",
    "level": "Category 1",
    "catNum": 1,
    "sec": "East 104",
    "sector": "East",
    "row": 5,
    "seat": 12,
    "gate": "B",
    "serial": "FIFA-94105-2026"
  }
  ```

---

### POST `/api/tickets/verify`
Validates a digital ticket serial barcode scanning code at gate checkpoints.
- **Method**: `POST`
- **Content-Type**: `application/json`
- **Request Body Payload**:
  ```json
  {
    "serial": "FIFA-94105-2026"
  }
  ```
- **Response Code**: `200 OK` (Valid) or `404 Not Found` (Invalid)
- **Response (200 OK)**:
  ```json
  {
    "verified": true,
    "ticket": { ... }
  }
  ```
- **Response (404 Not Found)**:
  ```json
  {
    "verified": false,
    "error": "Invalid or unknown ticket serial."
  }
  ```

---

### POST `/api/chat`
Seating navigation AI assistant. Uses semantic token indexing (RAG) to find rules from `stadium_knowledge.json`.
- **Method**: `POST`
- **Content-Type**: `application/json`
- **Request Body Payload**:
  ```json
  {
    "message": "Where are restrooms?"
  }
  ```
- **Response Code**: `200 OK`
- **Response Body Structure**:
  ```json
  {
    "response": "[Seat Guide Assistant - Offline RAG Mode]\nHere are the official stadium guidelines I retrieved..."
  }
  ```

---

## 🛡️ 2. Admin / Operations API Endpoints

### GET `/api/admin/incidents`
Fetches active and recently resolved incidents list.
- **Method**: `GET`
- **Response Code**: `200 OK`

---

### POST `/api/admin/incidents`
Logs a new incident report to dispatch volunteer escorts.
- **Method**: `POST`
- **Content-Type**: `application/json`
- **Request Body Payload**:
  ```json
  {
    "sector": "South",
    "category": "Medical",
    "severity": "HIGH",
    "description": "Heart attack reported in Section 122."
  }
  ```
- **Response Code**: `201 Created`

---

### POST `/api/admin/incidents/resolve`
Resolves an active warning incident.
- **Method**: `POST`
- **Content-Type**: `application/json`
- **Request Body Payload**:
  ```json
  {
    "id": "inc-54910"
  }
  ```
- **Response Code**: `200 OK`
  ```json
  {
    "success": true
  }
  ```

---

### POST `/api/admin/simulate`
Spikes congestion simulation metrics.
- **Method**: `POST`
- **Content-Type**: `application/json`
- **Request Body Payload**:
  ```json
  {
    "type": "congestion"
  }
  ```
- **Response Code**: `201 Created`

# Doctor Appointment System

## Project Structure
- **frontend/**: Vanilla JS/HTML/CSS Frontend.
- **appointment/**: Spring Boot Backend (Java).

## How to Run

### 1. Backend (Spring Boot)
1.  Open the `appointment` folder in your terminal or IDE (VS Code, IntelliJ).
2.  Ensure you have **Java 17+** and **Maven** installed.
3.  Ensure **MongoDB** is running locally on default port (27017).
4.  Run the application:
    ```bash
    cd appointment
    mvn spring-boot:run
    ```
    The server will start at `http://localhost:8080`.

### 2. Frontend
1.  Open the `frontend` folder.
2.  Double-click `index.html` to open in browser.

## Credentials (Hardcoded for Demo)
- **Admin**: `admin@medicare.com` / `admin123`
- **Doctor**: `doctor@medicare.com` / `doctor123`
- **Patient**: Register a new account (Stored in MongoDB).

## Features
- **Authentication**: Custom login logic with hardcoded Staff and DB-backed Patients.
- **Patient Dashboard**: View appointments, profile, etc.

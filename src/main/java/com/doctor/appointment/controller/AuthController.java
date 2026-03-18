package com.doctor.appointment.controller;

import com.doctor.appointment.model.LoginRequest;
import com.doctor.appointment.model.LoginResponse;
import com.doctor.appointment.model.User;
import com.doctor.appointment.model.Patient;
import com.doctor.appointment.repository.UserRepository;
import com.doctor.appointment.repository.PatientRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder; // Assuming this is here, if not I'll just do string compare for a simple demo if needed, but the import was already there.
import org.springframework.web.bind.annotation.*;

import java.util.Optional;
import org.springframework.web.client.RestTemplate;
import org.springframework.http.ResponseEntity;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin("*")
public class AuthController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PatientRepository patientRepository;

    @Autowired
    private BCryptPasswordEncoder encoder;

    @Autowired
    private com.doctor.appointment.service.EmailService emailService;

    // Temporary OTP Storage
    private java.util.Map<String, String> otpStorage = new java.util.concurrent.ConcurrentHashMap<>();

    // SEND OTP
    @PostMapping("/send-otp")
    public LoginResponse sendOtp(@RequestBody User user) {
        if (userRepository.findByEmail(user.getEmail()).isPresent()) {
            return new LoginResponse("Email already registered", false);
        }

        // Generate 6-digit OTP
        String otp = String.valueOf(new java.util.Random().nextInt(900000) + 100000);
        otpStorage.put(user.getEmail(), otp);

        // Send Email attempt
        boolean sent = emailService.sendOtpEmail(user.getEmail(), otp);

        if (sent) {
            return new LoginResponse("OTP sent to your email", true);
        } else {
            // Secure Behavior: If email fails, do NOT provide fallback.
            // User must configure valid email settings to register.
            otpStorage.remove(user.getEmail()); // Clean up
            return new LoginResponse("Failed to send OTP. Please check Email Server configuration.", false);
        }
    }

    // REGISTER
    @PostMapping("/register")
    public LoginResponse register(@RequestBody User user) {
        System.out.println("Processing registration for: " + user.getEmail());

        try {
            // Verify OTP - DISABLED FOR NOW
            // String serverOtp = otpStorage.get(user.getEmail());
            // if (serverOtp == null || !serverOtp.equals(user.getOtp())) {
            // return new LoginResponse("Invalid or expired OTP", false);
            // }

            if (userRepository.findByEmail(user.getEmail()).isPresent()) {
                return new LoginResponse("User already exists", false);
            }

            // DOCTOR REGISTRATION VALIDATION (Option 2: Automated Verification using NPI API)
            if ("doctor".equalsIgnoreCase(user.getRole())) {
                if (user.getMedicalLicenseNumber() == null || user.getMedicalLicenseNumber().trim().isEmpty()) {
                    return new LoginResponse("Medical License Number (NPI) is required for Doctors.", false);
                }

                String license = user.getMedicalLicenseNumber().trim();

                // 1. Basic format check (NPI numbers are 10 digits in the US)
                if (!license.matches("\\d{10}")) {
                     return new LoginResponse("Invalid format. NPI must be exactly 10 digits (e.g., 1234567890).", false);
                }

                // 2. Call the real NPI Registry API
                try {
                    RestTemplate restTemplate = new RestTemplate();
                    String apiUrl = "https://npiregistry.cms.hhs.gov/api/?number=" + license + "&version=2.1";
                    
                    ResponseEntity<String> response = restTemplate.getForEntity(apiUrl, String.class);
                    ObjectMapper mapper = new ObjectMapper();
                    JsonNode rootNode = mapper.readTree(response.getBody());
                    
                    if (rootNode.has("result_count") && rootNode.get("result_count").asInt() > 0) {
                        // Success! The API found the doctor.
                        JsonNode provider = rootNode.get("results").get(0).get("basic");
                        String verifiedName = provider.get("first_name").asText() + " " + provider.get("last_name").asText();
                        System.out.println("✅ VERIFIED DOCTOR: " + verifiedName + " (NPI: " + license + ")");
                        
                        // Optional: You could overwrite their provided name with their legal registered name here.
                        // user.setName(verifiedName); 
                    } else {
                        // The API did not find this license number in the real world
                        return new LoginResponse("❌ Verification Failed: This Medical License Number does not exist in the official US registry.", false);
                    }
                } catch (Exception apiEx) {
                    System.err.println("API Verification Error: " + apiEx.getMessage());
                    return new LoginResponse("Error communicating with the Medical Registry API. Please try again later.", false);
                }
            }

            user.setPassword(encoder.encode(user.getPassword()));
            User savedUser = userRepository.save(user);

            // Send Welcome Email only for Doctors
            if ("doctor".equalsIgnoreCase(savedUser.getRole())) {
                try {
                    emailService.sendWelcomeEmail(savedUser.getEmail(), savedUser.getName());
                } catch (Exception emailEx) {
                    // Log but don't fail registration if email fails
                    System.err.println("Failed to send welcome email: " + emailEx.getMessage());
                }
            }

            // Create Patient Profile Automatically if role is patient
            if ("patient".equalsIgnoreCase(savedUser.getRole())) {
                try {
                    Patient newPatient = new Patient();
                    newPatient.setEmail(savedUser.getEmail());
                    newPatient.setName(savedUser.getName());
                    // Other fields are optional initially
                    patientRepository.save(newPatient);
                } catch (Exception pEx) {
                    System.err.println("Failed to create patient profile: " + pEx.getMessage());
                }
            }

            // Cleanup OTP
            otpStorage.remove(user.getEmail());

            // Return extra info so frontend knows the ID
            return new LoginResponse("Registration successful", true, savedUser.getRole(), savedUser.getName(),
                    savedUser.getEmail());
        } catch (Exception e) {
            e.printStackTrace();
            return new LoginResponse("Error registering user: " + e.getMessage(), false);
        }
    }

    // LOGIN
    @PostMapping("/login")
    public LoginResponse login(@RequestBody LoginRequest request) {
        System.out.println("Login attempt for: " + request.getEmail());
        String email = request.getEmail();
        String password = request.getPassword();

        // 1. HARDCODED ADMIN CHECK
        if ("admin@medicare.com".equals(email) && "admin123".equals(password)) {
            return new LoginResponse("Login successful", true, "admin", "System Administrator", email);
        }

        // 2. HARDCODED DOCTOR CHECK
        if ("doctor@medicare.com".equals(email) && "doctor123".equals(password)) {
            return new LoginResponse("Login successful", true, "doctor", "Dr. House", email);
        }

        // 3. DB CHECK (Patients)
        Optional<User> userOpt = userRepository.findByEmail(email);
        if (userOpt.isPresent()) {
            User user = userOpt.get();
            if (encoder.matches(password, user.getPassword())) {
                return new LoginResponse("Login successful", true, user.getRole(),
                        user.getName() != null ? user.getName() : "User", user.getEmail(), user.getDoctorId());
            } else {
                return new LoginResponse("Invalid password", false);
            }
        }

        return new LoginResponse("User not found", false);
    }

    // RESET PASSWORD
    @PostMapping("/reset-password")
    public LoginResponse resetPassword(@RequestBody LoginRequest request) {
        String email = request.getEmail();
        String newPassword = request.getPassword(); // Reusing LoginRequest for convenience

        Optional<User> userOpt = userRepository.findByEmail(email);
        if (userOpt.isPresent()) {
            User user = userOpt.get();
            user.setPassword(encoder.encode(newPassword));
            userRepository.save(user);
            return new LoginResponse("Password reset successful", true);
        } else {
            return new LoginResponse("Email not found", false);
        }
    }
}

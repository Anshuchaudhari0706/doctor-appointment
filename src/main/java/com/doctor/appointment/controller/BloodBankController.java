package com.doctor.appointment.controller;

import com.doctor.appointment.model.BloodRequest;
import com.doctor.appointment.model.User;
import com.doctor.appointment.repository.BloodRequestRepository;
import com.doctor.appointment.repository.UserRepository;
import com.doctor.appointment.service.EmailService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/blood-bank")
@CrossOrigin("*")
public class BloodBankController {

    @Autowired
    private BloodRequestRepository bloodRequestRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private EmailService emailService;

    @GetMapping
    public List<BloodRequest> getAllRequests() {
        return bloodRequestRepository.findAllByOrderByRequestedDateDesc();
    }

    @PostMapping("/emergency")
    public BloodRequest createEmergencyRequest(@RequestBody BloodRequest request) {
        request.setRequestedDate(java.time.LocalDate.now().toString());
        request.setStatus("PENDING");
        BloodRequest saved = bloodRequestRepository.save(request);

        // Target System: Find all matching donors
        List<User> potentialDonors = userRepository.findAll(); // Iterate to find matches
        int matchCount = 0;
        for (User user : potentialDonors) {
            if ("patient".equalsIgnoreCase(user.getRole()) && 
                request.getBloodGroupRequired().equalsIgnoreCase(user.getBloodGroup())) {
                
                String subject = "URGENT: Blood Donation Needed (" + request.getBloodGroupRequired() + ")";
                String message = "Dear " + user.getName() + ",\n\n"
                        + "An emergency blood request has been raised at the hospital for " + request.getUnitsRequired() + " units of " 
                        + request.getBloodGroupRequired() + " blood. Since your registered blood type matches, please consider donating to save a life!\n\n"
                        + "Urgency: " + request.getUrgency() + "\n\n"
                        + "Please visit the hospital immediately if you are able to donate.\n"
                        + "Thank you,\nHospital Administration";

                try {
                    emailService.sendSimpleEmail(user.getEmail(), subject, message);
                    matchCount++;
                } catch(Exception e) {
                    System.err.println("Failed to notify donor: " + user.getEmail());
                }
            }
        }
        
        System.out.println("Emergency Blood Request Sent. Notified " + matchCount + " matching donors.");
        return saved;
    }

    @PutMapping("/{id}/fulfill")
    public BloodRequest fulfillRequest(@PathVariable String id) {
        BloodRequest req = bloodRequestRepository.findById(id).orElseThrow(() -> new RuntimeException("Request not found"));
        req.setStatus("FULFILLED");
        return bloodRequestRepository.save(req);
    }

    @DeleteMapping("/{id}")
    public void deleteRequest(@PathVariable String id) {
        bloodRequestRepository.deleteById(id);
    }
}

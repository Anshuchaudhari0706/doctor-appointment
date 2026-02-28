package com.doctor.appointment.controller;

import com.doctor.appointment.model.User;
import com.doctor.appointment.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder; // Removed this locally if it fails
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/receptionists")
@CrossOrigin("*")
public class ReceptionistController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private BCryptPasswordEncoder encoder;

    @PostMapping
    public User createReceptionist(@RequestBody User user) {
        user.setRole("receptionist");
        user.setPassword(encoder.encode(user.getPassword()));
        return userRepository.save(user);
    }

    @GetMapping("/doctor/{doctorId}")
    public List<User> getReceptionistsByDoctor(@PathVariable String doctorId) {
        return userRepository.findByRoleAndDoctorId("receptionist", doctorId);
    }

    @DeleteMapping("/{id}")
    public void deleteReceptionist(@PathVariable String id) {
        userRepository.deleteById(id);
    }
}

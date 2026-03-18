package com.doctor.appointment.controller;

import com.doctor.appointment.model.Bed;
import com.doctor.appointment.repository.BedRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/beds")
@CrossOrigin("*")
public class BedController {

    @Autowired
    private BedRepository bedRepository;

    @GetMapping
    public List<Bed> getAllBeds() {
        return bedRepository.findAll();
    }

    @PostMapping
    public Bed addBed(@RequestBody Bed bed) {
        if(bed.getStatus() == null || bed.getStatus().isEmpty()) {
            bed.setStatus("AVAILABLE");
        }
        return bedRepository.save(bed);
    }

    @PutMapping("/{id}/assign")
    public Bed assignPatient(@PathVariable String id, @RequestBody Bed assignInfo) {
        Optional<Bed> bedOpt = bedRepository.findById(id);
        if (bedOpt.isPresent()) {
            Bed bed = bedOpt.get();
            bed.setStatus("OCCUPIED");
            bed.setPatientEmail(assignInfo.getPatientEmail());
            bed.setPatientName(assignInfo.getPatientName());
            bed.setAdmissionDate(java.time.LocalDate.now().toString());
            return bedRepository.save(bed);
        }
        throw new RuntimeException("Bed not found");
    }

    @PutMapping("/{id}/discharge")
    public Bed dischargePatient(@PathVariable String id) {
        Optional<Bed> bedOpt = bedRepository.findById(id);
        if (bedOpt.isPresent()) {
            Bed bed = bedOpt.get();
            bed.setStatus("AVAILABLE");
            bed.setPatientEmail(null);
            bed.setPatientName(null);
            bed.setAdmissionDate(null);
            return bedRepository.save(bed);
        }
        throw new RuntimeException("Bed not found");
    }

    @DeleteMapping("/{id}")
    public void deleteBed(@PathVariable String id) {
        bedRepository.deleteById(id);
    }
}

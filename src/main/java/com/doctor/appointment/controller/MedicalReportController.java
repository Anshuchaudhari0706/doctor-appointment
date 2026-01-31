package com.doctor.appointment.controller;

import com.doctor.appointment.model.MedicalReport;
import com.doctor.appointment.repository.MedicalReportRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/reports")
@CrossOrigin("*")
public class MedicalReportController {

    @Autowired
    private MedicalReportRepository reportRepository;

    @GetMapping("/{email}")
    public List<MedicalReport> getReports(@PathVariable String email) {
        return reportRepository.findByPatientEmail(email);
    }

    @PostMapping
    public MedicalReport addReport(@RequestBody MedicalReport report) {
        return reportRepository.save(report);
    }
}

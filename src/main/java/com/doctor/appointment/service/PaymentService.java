package com.doctor.appointment.service;

import com.doctor.appointment.model.Payment;
import com.doctor.appointment.repository.PaymentRepository;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class PaymentService {

    @Autowired
    private PaymentRepository paymentRepository;

    public List<Payment> getAllPayments() {
        return paymentRepository.findAll();
    }

    public Payment savePayment(Payment payment) {
        return paymentRepository.save(payment);
    }

    public List<Payment> getByAppointment(String appointmentId) {
        return paymentRepository.findByAppointmentId(appointmentId);
    }
}

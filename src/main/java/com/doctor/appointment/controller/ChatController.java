package com.doctor.appointment.controller;

import com.doctor.appointment.model.ChatMessage;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessageSendingOperations;
import org.springframework.stereotype.Controller;
import org.springframework.beans.factory.annotation.Autowired;

@Controller
public class ChatController {

    @Autowired
    private SimpMessageSendingOperations messagingTemplate;

    @MessageMapping("/chat/{appointmentId}/sendMessage")
    public void sendMessage(@DestinationVariable String appointmentId, @Payload ChatMessage chatMessage) {
        // Send to the specifically subscribed topic for this appointment chat room
        messagingTemplate.convertAndSend("/topic/public/" + appointmentId, chatMessage);
    }

    @MessageMapping("/chat/{appointmentId}/addUser")
    public void addUser(@DestinationVariable String appointmentId, @Payload ChatMessage chatMessage, 
                        SimpMessageHeaderAccessor headerAccessor) {
        // Add username in web socket session
        headerAccessor.getSessionAttributes().put("username", chatMessage.getSender());
        headerAccessor.getSessionAttributes().put("appointmentId", appointmentId);
        
        messagingTemplate.convertAndSend("/topic/public/" + appointmentId, chatMessage);
    }
}

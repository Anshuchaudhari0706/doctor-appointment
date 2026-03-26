package com.doctor.appointment.model;

public class ChatMessage {
    private String content;
    private String sender;
    private String role; // "patient" or "doctor"

    public ChatMessage() {}

    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }

    public String getSender() { return sender; }
    public void setSender(String sender) { this.sender = sender; }

    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }
}

package com.doctor.appointment.controller;

import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.io.IOException;
import java.net.MalformedURLException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.UUID;

@RestController
@RequestMapping("/api/upload")
@CrossOrigin("*")
public class FileController {

    private final Path fileStorageLocation;

    public FileController() {
        this.fileStorageLocation = Paths.get("uploads").toAbsolutePath().normalize();
        try {
            Files.createDirectories(this.fileStorageLocation);
        } catch (Exception ex) {
            throw new RuntimeException("Could not create the directory where the uploaded files will be stored.", ex);
        }
    }

    @PostMapping
    public ResponseEntity<String> uploadFile(@RequestParam("file") MultipartFile file) {
        try {
            // Normalize file name
            String originalFileName = file.getOriginalFilename();
            String fileExtension = "";
            if (originalFileName != null && originalFileName.contains(".")) {
                fileExtension = originalFileName.substring(originalFileName.lastIndexOf("."));
            }
            String fileName = UUID.randomUUID().toString() + fileExtension;

            // Copy file to the target location (Replacing existing file with the same name)
            Path targetLocation = this.fileStorageLocation.resolve(fileName);
            Files.copy(file.getInputStream(), targetLocation, StandardCopyOption.REPLACE_EXISTING);

            // Build the download URI
            // Use Controller Endpoint /api/upload/{fileName}
            String fileDownloadUri = ServletUriComponentsBuilder.fromCurrentContextPath().path("/api/upload/")
                    .path(fileName).toUriString();

            return ResponseEntity.ok("{\"url\": \"" + fileDownloadUri + "\"}");
        } catch (IOException ex) {
            ex.printStackTrace();
            return ResponseEntity.internalServerError().body("{\"error\": \"Could not upload file\"}");
        }
    }

    @GetMapping("/{fileName:.+}")
    public ResponseEntity<Resource> downloadFile(@PathVariable String fileName) {
        try {
            Path filePath = this.fileStorageLocation.resolve(fileName).normalize();
            System.out.println("DEBUG: Request to download file: " + fileName);
            System.out.println("DEBUG: Resolved file path: " + filePath.toAbsolutePath());

            Resource resource = new UrlResource(filePath.toUri());
            if (resource.exists()) {
                System.out.println("DEBUG: File exists, returning content.");
                return ResponseEntity.ok().header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"" + resource.getFilename() + "\"").body(resource);
            } else {
                System.out.println("DEBUG: File NOT found at path.");
                return ResponseEntity.notFound().build();
            }
        } catch (MalformedURLException ex) {
            System.out.println("DEBUG: Malformed URL Exception: " + ex.getMessage());
            return ResponseEntity.notFound().build();
        }
    }
}

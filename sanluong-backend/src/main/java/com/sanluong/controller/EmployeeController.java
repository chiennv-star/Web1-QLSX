package com.sanluong.controller;

import com.sanluong.dto.EmployeeDto;
import com.sanluong.entity.Employee;
import com.sanluong.service.EmployeeService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.http.*;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Map;

@RestController
@RequestMapping("/api/employees")
public class EmployeeController {

    private final EmployeeService service;

    public EmployeeController(EmployeeService service) {
        this.service = service;
    }

    @GetMapping
    public ResponseEntity<Page<Employee>> search(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String toNhom,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
        return ResponseEntity.ok(service.search(search, toNhom, page, size));
    }

    @GetMapping("/{id}")
    public ResponseEntity<Employee> getById(@PathVariable Long id) {
        return ResponseEntity.ok(service.getById(id));
    }

    @PostMapping
    public ResponseEntity<Employee> create(@Valid @RequestBody EmployeeDto dto, Authentication auth) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(dto, auth.getName()));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Employee> update(@PathVariable Long id,
                                            @Valid @RequestBody EmployeeDto dto,
                                            Authentication auth) {
        return ResponseEntity.ok(service.update(id, dto, auth.getName()));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }

    // ── Import Excel ──────────────────────────────────────────────────────────
    @PostMapping("/import")
    public ResponseEntity<?> importExcel(
            @RequestParam("file") MultipartFile file,
            Authentication auth) {
        if (file == null || file.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "File không được để trống"));
        }
        String name = file.getOriginalFilename() != null ? file.getOriginalFilename().toLowerCase() : "";
        if (!name.endsWith(".xlsx") && !name.endsWith(".xls")) {
            return ResponseEntity.badRequest().body(Map.of("error", "Chỉ hỗ trợ file Excel (.xlsx, .xls)"));
        }
        try {
            Map<String, Object> result = service.importFromExcel(file, auth.getName());
            return ResponseEntity.ok(result);
        } catch (IOException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("error", "Lỗi đọc file: " + e.getMessage()));
        }
    }

    // ── Download template ─────────────────────────────────────────────────────
    @GetMapping("/import/template")
    public ResponseEntity<byte[]> downloadTemplate() {
        try {
            byte[] bytes = service.generateImportTemplate();
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.parseMediaType(
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"));
            headers.setContentDispositionFormData("attachment", "mau-import-nhan-su.xlsx");
            return ResponseEntity.ok().headers(headers).body(bytes);
        } catch (IOException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
}

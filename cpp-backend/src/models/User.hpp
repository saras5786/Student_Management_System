#pragma once

// ==============================================================================
// OOP CONCEPT: INHERITANCE & POLYMORPHISM (ABSTRACT BASE CLASS & VIRTUAL METHODS)
// File: cpp-backend/src/models/User.hpp
//
// WHAT IS THIS CONCEPT?
// 1. Inheritance: A child class inherits properties and methods from a parent class.
// 2. Polymorphism: The ability for different classes to be treated as instances of
//    the same parent class through pointers or references, while executing their
//    own specific behaviors via "virtual functions".
// 3. Abstract Class: A class containing at least one "pure virtual" method (= 0).
//    It cannot be directly instantiated; it defines a contract that derived classes
//    MUST implement.
//
// WHY DO WE USE IT HERE?
// In our university system, we have two distinct types of users:
// - AdminUser (University staff/administrator)
// - StudentUser (Enrolled CSE student)
// Both are "Users", so they share common attributes (ID, display name), but they
// have completely different roles, permissions, and profile representations.
// By using an abstract User base class, our authentication system can hold a
// std::shared_ptr<User> without needing to know whether the user is an Admin
// or a Student until role-based access checks (RBAC) are performed.
// ==============================================================================

#include <string>
#include <memory>
#include <nlohmann/json.hpp>

// Base Abstract Class
class User {
protected:
    // C++ CONCEPT: PROTECTED ACCESS SPECIFIER
    // Protected members are accessible within this class AND within derived classes,
    // but hidden from outside code (Encapsulation).
    int m_id;
    std::string m_name;

public:
    // C++ CONCEPT: CONSTRUCTOR INITIALIZER LIST
    // Initializes member variables directly and efficiently before the constructor body runs.
    User(int id, const std::string& name)
        : m_id(id), m_name(name) {}

    // C++ CONCEPT: VIRTUAL DESTRUCTOR
    // Essential when deleting derived class objects through a base class pointer.
    // Without a virtual destructor, deleting a User* pointing to a StudentUser
    // would result in undefined behavior (memory leaks of derived members).
    virtual ~User() = default;

    // Getters
    int getId() const { return m_id; }
    const std::string& getName() const { return m_name; }

    // C++ CONCEPT: PURE VIRTUAL FUNCTIONS (= 0)
    // Makes User an abstract class. Every derived class must provide its own implementation.
    virtual std::string getRole() const = 0;
    virtual bool isAdmin() const = 0;
    virtual nlohmann::json toJson() const = 0;
};

// ==============================================================================
// DERIVED CLASS 1: AdminUser
// Inherits publicly from User (IS-A relationship: AdminUser IS A User)
// ==============================================================================
class AdminUser : public User {
private:
    std::string m_username;

public:
    // Calling base class constructor via initialization list
    AdminUser(int id, const std::string& username, const std::string& name)
        : User(id, name), m_username(username) {}

    const std::string& getUsername() const { return m_username; }

    // C++ CONCEPT: 'override' KEYWORD
    // Tells the compiler that this function is intentionally overriding a virtual
    // function from the base class. The compiler will catch typos or signature mismatches.
    std::string getRole() const override {
        return "ADMIN";
    }

    bool isAdmin() const override {
        return true;
    }

    nlohmann::json toJson() const override {
        return {
            {"id", m_id},
            {"username", m_username},
            {"name", m_name},
            {"role", "ADMIN"}
        };
    }
};

// ==============================================================================
// DERIVED CLASS 2: StudentUser
// Inherits publicly from User (IS-A relationship: StudentUser IS A User)
// ==============================================================================
class StudentUser : public User {
private:
    std::string m_studentId; // e.g. "25b11cs001"
    nlohmann::json m_profile; // Full academic profile

public:
    StudentUser(int id, const std::string& studentId, const std::string& name, const nlohmann::json& profile = nullptr)
        : User(id, name), m_studentId(studentId), m_profile(profile) {}

    const std::string& getStudentId() const { return m_studentId; }

    std::string getRole() const override {
        return "STUDENT";
    }

    bool isAdmin() const override {
        return false;
    }

    nlohmann::json toJson() const override {
        nlohmann::json j = {
            {"id", m_id},
            {"studentId", m_studentId},
            {"name", m_name},
            {"role", "STUDENT"}
        };
        if (!m_profile.is_null()) {
            j["profile"] = m_profile;
        }
        return j;
    }
};

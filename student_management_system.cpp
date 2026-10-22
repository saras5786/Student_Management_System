// ==============================================================================
// ADITYA UNIVERSITY - STUDENT MANAGEMENT SYSTEM (AU-SMS)
// File: student_management_system.cpp
//
// THIS IS A COMPLETE, ALL-IN-ONE STANDALONE C++ PROGRAM.
// You can compile and run it directly in any terminal:
//
//   Using MSVC (Visual Studio Developer Command Prompt):
//       cl /EHsc /std:c++20 student_management_system.cpp
//       student_management_system.exe
//
//   Using GCC / MinGW:
//       g++ -std=c++20 student_management_system.cpp -o student_management_system.exe
//       ./student_management_system.exe
//
// ==============================================================================
// TABLE OF C++ CONCEPTS INCLUDED IN THIS FILE:
// 1. Classes and Objects                (Lines ~60, Student, Person, Admin)
// 2. Encapsulation & Data Hiding        (Private variables, Public getters/setters)
// 3. Constructor & Destructor           (Default, Parameterized, Virtual Destructors)
// 4. Inheritance                        (Base class Person -> Derived classes Student, Admin)
// 5. Polymorphism (Runtime & Compile-Time):
//    - Pure Virtual Functions (= 0)     (Abstract Base Class)
//    - Virtual Functions & 'override'   (Dynamic Method Dispatch)
//    - Function Overloading             (Multiple functions with same name, diff params)
//    - Operator Overloading (<<)        (Printing objects directly using cout << student)
// 6. Templates (Generic Programming):
//    - Function Template                (Generic printBox<T>() for any data type)
//    - Class Template                   (Generic Repository<T> container for any entity)
// 7. Abstraction                        (AcademicGradeCalculator hiding math formulas)
// 8. Exception Handling                 (try, catch, throw std::invalid_argument)
// 9. STL Containers & Algorithms        (std::vector, std::string, std::sort, std::unique_ptr)
// 10. File Handling (I/O Streams)       (std::ofstream, std::ifstream saving/loading to disk)
// ==============================================================================

#include <iostream>
#include <fstream>
#include <sstream>
#include <string>
#include <vector>
#include <memory>
#include <iomanip>
#include <algorithm>
#include <stdexcept>
#include <cmath>

// ==============================================================================
// CONCEPT 6 (Part A): TEMPLATES (FUNCTION TEMPLATE)
//
// WHAT IS A TEMPLATE?
// A template allows us to write generic code that works with ANY data type
// (int, double, string, custom classes) without rewriting the function!
//
// WHY DO WE USE IT HERE?
// We want to print fancy stylized boxes/headers in the terminal for numbers,
// strings, or custom titles without making duplicate functions.
// ==============================================================================
template <typename T>
void printBanner(const T& title) {
    std::cout << "\n================================================================\n";
    std::cout << "  " << title << "\n";
    std::cout << "================================================================\n";
}

// Template with two types to format label-value pairs
template <typename T1, typename T2>
void printField(const T1& label, const T2& value) {
    std::cout << "  " << std::left << std::setw(22) << label << ": " << value << "\n";
}


// ==============================================================================
// CONCEPT 7: ABSTRACTION (STATIC UTILITY CLASS)
//
// WHAT IS ABSTRACTION?
// Showing only essential features to the user while hiding internal complexities.
// The caller just says "give me the grade for 85%", without having to know the
// complex internal if-else logic.
//
// WHY IS IT STATIC?
// We don't need to create an object of AcademicGradeCalculator. It performs pure
// mathematical calculations directly from input values.
// ==============================================================================
class AcademicGradeCalculator {
public:
    // Delete constructor so nobody can create an object of this utility class
    AcademicGradeCalculator() = delete;

    // Calculate total marks out of 500
    static double calculateTotal(double m1, double m2, double m3, double m4, double m5) {
        return m1 + m2 + m3 + m4 + m5;
    }

    // Calculate percentage (Total / 5)
    static double calculatePercentage(double totalMarks) {
        return std::round((totalMarks / 5.0) * 100.0) / 100.0;
    }

    // Determine Letter Grade according to Aditya University scale
    static std::string calculateGrade(double percentage) {
        if (percentage >= 90.0) return "A+";
        if (percentage >= 80.0) return "A";
        if (percentage >= 70.0) return "B";
        if (percentage >= 60.0) return "C";
        if (percentage >= 50.0) return "D";
        return "F";
    }

    // Determine Grade Point (10-point SGPA scale)
    static int calculateGradePoint(const std::string& grade) {
        if (grade == "A+") return 10;
        if (grade == "A")  return 9;
        if (grade == "B")  return 8;
        if (grade == "C")  return 7;
        if (grade == "D")  return 6;
        return 0; // Fail has 0 grade points
    }

    // Pass / Fail status
    static std::string calculateStatus(double percentage) {
        return (percentage >= 50.0) ? "PASS" : "FAIL";
    }
};


// ==============================================================================
// CONCEPT 4: INHERITANCE (BASE CLASS)
// CONCEPT 5 (Part A): RUNTIME POLYMORPHISM (ABSTRACT BASE CLASS & VIRTUAL FUNCTIONS)
//
// WHAT IS INHERITANCE?
// Inheritance allows a new class (derived class) to acquire the properties and
// behaviors of an existing class (base class). Here, Person is the Base Class.
// Both Student and Admin are Persons!
//
// WHAT IS AN ABSTRACT CLASS?
// A class that contains at least one "Pure Virtual Function" (= 0).
// You CANNOT create an object of Person directly (e.g., 'Person p;' will give error).
// It acts as a template/contract that derived classes MUST implement!
// ==============================================================================
class Person {
protected:
    // C++ CONCEPT: 'protected' ACCESS SPECIFIER
    // Private variables are only visible inside Person.
    // BUT 'protected' variables are also accessible by Child classes (Student, Admin)!
    std::string m_name;
    std::string m_gender;

public:
    // Parameterized Constructor
    Person(const std::string& name, const std::string& gender)
        : m_name(name), m_gender(gender) {}

    // C++ CONCEPT: VIRTUAL DESTRUCTOR
    // Crucial for memory safety! When we delete a derived object (Student)
    // through a base pointer (Person*), the virtual destructor ensures
    // the Student's destructor runs first, preventing memory leaks.
    virtual ~Person() = default;

    // Getters (Const member functions: guaranteed not to modify the object)
    std::string getName() const { return m_name; }
    std::string getGender() const { return m_gender; }

    void setName(const std::string& name) { m_name = name; }
    void setGender(const std::string& gender) { m_gender = gender; }

    // C++ CONCEPT: PURE VIRTUAL FUNCTION (= 0)
    // Every child class MUST write its own version of this method!
    virtual std::string getRole() const = 0;

    // C++ CONCEPT: VIRTUAL FUNCTION (CAN BE OVERRIDDEN)
    virtual void printDetails() const {
        printField("Full Name", m_name);
        printField("Gender", m_gender);
        printField("Role", getRole());
    }
};


// ==============================================================================
// CONCEPT 1 & 2: CLASS, OBJECT, ENCAPSULATION & DATA HIDING
// CONCEPT 4 (Part B): DERIVED CLASS (Student inherits from Person)
//
// WHAT IS ENCAPSULATION?
// Wrapping data and code together. Member variables are 'private', so nobody
// can tamper with them directly. Changes must go through public methods
// (setters) which validate the data (e.g. check marks between 0 and 100).
// ==============================================================================
class Student : public Person {
private:
    // Private member variables (Encapsulation - Data Hiding)
    std::string m_studentId;      // e.g. "25b11cs001"
    std::string m_branch;         // e.g. "CSE"
    std::string m_semester;       // e.g. "Semester 1"
    double m_attendance;          // e.g. 94.5%

    // 5 Core CSE Subject Marks
    double m_mathematics;
    double m_physics;
    double m_python;
    double m_dataStructures;
    double m_english;

    // Calculated Academic Results
    double m_totalMarks;
    double m_percentage;
    std::string m_grade;
    int m_gradePoint;
    std::string m_status;

    // Private helper method to recalculate derived academic results
    void recalculateMetrics() {
        m_totalMarks = AcademicGradeCalculator::calculateTotal(
            m_mathematics, m_physics, m_python, m_dataStructures, m_english
        );
        m_percentage = AcademicGradeCalculator::calculatePercentage(m_totalMarks);
        m_grade = AcademicGradeCalculator::calculateGrade(m_percentage);
        m_gradePoint = AcademicGradeCalculator::calculateGradePoint(m_grade);
        m_status = AcademicGradeCalculator::calculateStatus(m_percentage);
    }

public:
    // C++ CONCEPT: CONSTRUCTOR INITIALIZER LIST
    // Initializes the Base Class (Person) and member variables before constructor body runs.
    Student(const std::string& studentId, const std::string& name, const std::string& gender,
            const std::string& branch, const std::string& semester, double attendance,
            double math, double phys, double py, double ds, double eng)
        : Person(name, gender),
          m_studentId(studentId), m_branch(branch), m_semester(semester), m_attendance(attendance),
          m_mathematics(math), m_physics(phys), m_python(py), m_dataStructures(ds), m_english(eng)
    {
        // Validate marks upon creation (Exception Handling)
        validateMark("Mathematics", math);
        validateMark("Physics", phys);
        validateMark("Python", py);
        validateMark("Data Structures", ds);
        validateMark("English", eng);
        validateAttendance(attendance);

        recalculateMetrics();
    }

    // Default Constructor
    Student()
        : Person("", "Male"), m_studentId(""), m_branch("CSE"), m_semester("Semester 1"),
          m_attendance(0), m_mathematics(0), m_physics(0), m_python(0), m_dataStructures(0),
          m_english(0), m_totalMarks(0), m_percentage(0), m_grade("F"), m_gradePoint(0), m_status("FAIL") {}

    // C++ CONCEPT: EXCEPTION HANDLING HELPER (THROWING EXCEPTIONS)
    static void validateMark(const std::string& subject, double mark) {
        if (mark < 0.0 || mark > 100.0) {
            throw std::invalid_argument("Invalid mark for " + subject + ": " + std::to_string(mark) + " (Must be 0-100)");
        }
    }

    static void validateAttendance(double att) {
        if (att < 0.0 || att > 100.0) {
            throw std::invalid_argument("Invalid attendance percentage: " + std::to_string(att) + " (Must be 0-100)");
        }
    }

    // ==========================================================================
    // GETTERS (Accessor methods)
    // ==========================================================================
    std::string getStudentId() const { return m_studentId; }
    std::string getBranch() const { return m_branch; }
    std::string getSemester() const { return m_semester; }
    double getAttendance() const { return m_attendance; }
    double getMathematics() const { return m_mathematics; }
    double getPhysics() const { return m_physics; }
    double getPython() const { return m_python; }
    double getDataStructures() const { return m_dataStructures; }
    double getEnglish() const { return m_english; }
    double getTotalMarks() const { return m_totalMarks; }
    double getPercentage() const { return m_percentage; }
    std::string getGrade() const { return m_grade; }
    int getGradePoint() const { return m_gradePoint; }
    std::string getStatus() const { return m_status; }

    // ==========================================================================
    // SETTERS (Mutator methods with automatic metric recalculation)
    // ==========================================================================
    void setAttendance(double att) {
        validateAttendance(att);
        m_attendance = att;
    }

    void setMarks(double math, double phys, double py, double ds, double eng) {
        validateMark("Mathematics", math);
        validateMark("Physics", phys);
        validateMark("Python", py);
        validateMark("Data Structures", ds);
        validateMark("English", eng);

        m_mathematics = math;
        m_physics = phys;
        m_python = py;
        m_dataStructures = ds;
        m_english = eng;
        recalculateMetrics();
    }

    // ==========================================================================
    // CONCEPT 5 (Part B): RUNTIME POLYMORPHISM ('override' KEYWORD)
    // Overriding the pure virtual function from Person
    // ==========================================================================
    std::string getRole() const override {
        return "STUDENT";
    }

    // Overriding printDetails from Person to print student academic scorecard
    void printDetails() const override {
        Person::printDetails(); // Call base class printDetails
        printField("Student Roll No", m_studentId);
        printField("Branch", m_branch);
        printField("Semester", m_semester);
        printField("Attendance", std::to_string(m_attendance) + "%");
        std::cout << "  --------------------------------------------------------------\n";
        std::cout << "  [Subject Marks (Out of 100)]:\n";
        printField("   * Mathematics", m_mathematics);
        printField("   * Physics", m_physics);
        printField("   * Python Programming", m_python);
        printField("   * Data Structures", m_dataStructures);
        printField("   * English", m_english);
        std::cout << "  --------------------------------------------------------------\n";
        printField("Total Marks", std::to_string(m_totalMarks) + " / 500");
        printField("Aggregate Percentage", std::to_string(m_percentage) + "%");
        printField("Letter Grade", m_grade);
        printField("Grade Point (SGPA)", m_gradePoint);
        printField("Academic Status", m_status);
    }

    // ==========================================================================
    // CONCEPT 5 (Part C): COMPILE-TIME POLYMORPHISM (OPERATOR OVERLOADING)
    //
    // WHAT IS OPERATOR OVERLOADING?
    // Giving special meaning to an existing C++ operator (like << or <)
    // when used with our custom class (Student).
    // Now we can do: std::cout << studentInstance; directly!
    // ==========================================================================
    friend std::ostream& operator<<(std::ostream& os, const Student& s) {
        os << "[" << s.m_studentId << "] "
           << std::left << std::setw(20) << s.m_name
           << " | Sem: " << s.m_semester
           << " | Att: " << std::fixed << std::setprecision(1) << s.m_attendance << "%"
           << " | Pct: " << std::fixed << std::setprecision(2) << s.m_percentage << "%"
           << " | Grade: " << std::setw(2) << s.m_grade
           << " | Status: " << s.m_status;
        return os;
    }

    // Overload '<' operator so we can sort students by percentage descending (Dean's list)
    bool operator<(const Student& other) const {
        return this->m_percentage > other.m_percentage; // Greater percentage comes first
    }

    // Convert student data to CSV line for file storage
    std::string toCsvLine() const {
        std::ostringstream ss;
        ss << m_studentId << ","
           << m_name << ","
           << m_gender << ","
           << m_branch << ","
           << m_semester << ","
           << m_attendance << ","
           << m_mathematics << ","
           << m_physics << ","
           << m_python << ","
           << m_dataStructures << ","
           << m_english;
        return ss.str();
    }

    // Construct student from CSV line
    static Student fromCsvLine(const std::string& line) {
        std::stringstream ss(line);
        std::string id, name, gender, branch, sem, sAtt, sM, sP, sPy, sDs, sE;

        std::getline(ss, id, ',');
        std::getline(ss, name, ',');
        std::getline(ss, gender, ',');
        std::getline(ss, branch, ',');
        std::getline(ss, sem, ',');
        std::getline(ss, sAtt, ',');
        std::getline(ss, sM, ',');
        std::getline(ss, sP, ',');
        std::getline(ss, sPy, ',');
        std::getline(ss, sDs, ',');
        std::getline(ss, sE, ',');

        return Student(id, name, gender, branch, sem,
                       std::stod(sAtt), std::stod(sM), std::stod(sP),
                       std::stod(sPy), std::stod(sDs), std::stod(sE));
    }
};


// ==============================================================================
// CONCEPT 4 (Part C): ANOTHER DERIVED CLASS (Admin inherits from Person)
// ==============================================================================
class Admin : public Person {
private:
    std::string m_username;
    std::string m_department;

public:
    Admin(const std::string& username, const std::string& name, const std::string& department)
        : Person(name, "Male"), m_username(username), m_department(department) {}

    std::string getRole() const override {
        return "ADMINISTRATOR";
    }

    void printDetails() const override {
        Person::printDetails();
        printField("Username", m_username);
        printField("Department", m_department);
    }
};


// ==============================================================================
// CONCEPT 6 (Part B): TEMPLATES (CLASS TEMPLATE / GENERIC CONTAINER)
//
// WHAT IS A CLASS TEMPLATE?
// A blueprint for a class where data types are parameterized with <typename T>.
// This Repository<T> works whether T is Student, Course, Faculty, or Book!
//
// WHY DO WE USE IT HERE?
// In professional software engineering, we avoid writing separate list managers
// for each model. The generic Repository handles storing, counting, adding,
// and iterating items safely.
// ==============================================================================
template <typename T>
class Repository {
private:
    // C++ CONCEPT: STL CONTAINER (std::vector)
    // Dynamic array that grows and shrinks in memory automatically.
    std::vector<T> m_items;

public:
    Repository() = default;

    // Add an item to repository
    void add(const T& item) {
        m_items.push_back(item);
    }

    // Get total count
    size_t count() const {
        return m_items.size();
    }

    // Access by index
    T& get(size_t index) {
        if (index >= m_items.size()) {
            throw std::out_of_range("Repository index out of range!");
        }
        return m_items[index];
    }

    const T& get(size_t index) const {
        if (index >= m_items.size()) {
            throw std::out_of_range("Repository index out of range!");
        }
        return m_items[index];
    }

    // Direct access to internal vector
    std::vector<T>& getAll() {
        return m_items;
    }

    const std::vector<T>& getAll() const {
        return m_items;
    }

    void clear() {
        m_items.clear();
    }
};


// ==============================================================================
// CONCEPT 10: FILE HANDLING (PERSISTENCE LAYER)
//
// Uses std::ofstream (writing) and std::ifstream (reading) to save records to disk.
// ==============================================================================
class FileStorageManager {
public:
    static bool saveStudentsToFile(const std::string& filename, const Repository<Student>& repo) {
        std::ofstream outFile(filename);
        if (!outFile.is_open()) {
            std::cerr << "[Error] Unable to open file for writing: " << filename << "\n";
            return false;
        }

        // Write header
        outFile << "student_id,name,gender,branch,semester,attendance,mathematics,physics,python,data_structures,english\n";

        for (size_t i = 0; i < repo.count(); ++i) {
            outFile << repo.get(i).toCsvLine() << "\n";
        }

        outFile.close();
        return true;
    }

    static bool loadStudentsFromFile(const std::string& filename, Repository<Student>& repo) {
        std::ifstream inFile(filename);
        if (!inFile.is_open()) {
            return false; // File doesn't exist yet
        }

        repo.clear();
        std::string line;
        bool isHeader = true;

        while (std::getline(inFile, line)) {
            if (line.empty()) continue;
            if (isHeader) {
                isHeader = false; // Skip CSV header
                continue;
            }
            try {
                Student s = Student::fromCsvLine(line);
                repo.add(s);
            } catch (...) {
                // Ignore corrupted lines
            }
        }

        inFile.close();
        return true;
    }
};


// ==============================================================================
// STUDENT MANAGEMENT APPLICATION CONTROLLER
// Demonstrates all OOP concepts together in an interactive console menu!
// ==============================================================================
class StudentManagementSystemApp {
private:
    Repository<Student> m_studentRepo;
    Admin m_currentAdmin;
    const std::string m_dataFile = "students_database.csv";

    // Seed some initial Aditya University students if file is empty
    void seedInitialStudents() {
        if (m_studentRepo.count() == 0) {
            m_studentRepo.add(Student("25b11cs001", "Kalyanam Mukundha", "Male", "CSE", "Semester 1", 94.5, 93.2, 91.7, 93.6, 95.8, 91.4));
            m_studentRepo.add(Student("25b11cs002", "Ananya Sharma", "Female", "CSE", "Semester 1", 96.0, 95.5, 94.0, 98.0, 97.0, 93.5));
            m_studentRepo.add(Student("25b11cs003", "Rahul Varma", "Male", "CSE", "Semester 2", 82.0, 78.0, 81.0, 85.0, 79.5, 84.0));
            m_studentRepo.add(Student("25b11cs004", "Sneha Reddy", "Female", "CSE", "Semester 2", 91.0, 89.0, 92.5, 94.0, 90.0, 88.5));
            m_studentRepo.add(Student("25b11cs005", "Venkatesh Rao", "Male", "CSE", "Semester 3", 71.5, 62.0, 58.5, 66.0, 61.0, 55.0));
            m_studentRepo.add(Student("25b11cs006", "Pooja Hegde", "Female", "CSE", "Semester 1", 68.0, 48.0, 44.0, 52.0, 46.0, 49.0)); // Remedial student
            FileStorageManager::saveStudentsToFile(m_dataFile, m_studentRepo);
        }
    }

public:
    StudentManagementSystemApp()
        : m_currentAdmin("admin", "Dr. Satyanarayana (HOD)", "Computer Science & Engineering")
    {
        // Try loading existing file
        if (!FileStorageManager::loadStudentsFromFile(m_dataFile, m_studentRepo)) {
            seedInitialStudents();
        }
    }

    // Display all students using Operator Overloading (cout << student)
    void displayAllStudents() const {
        printBanner("ADITYA UNIVERSITY - CSE DEPARTMENT ENROLLED STUDENTS");
        if (m_studentRepo.count() == 0) {
            std::cout << "  No student records found.\n";
            return;
        }

        std::cout << "  " << std::left << std::setw(14) << "Roll No"
                  << std::setw(22) << "Name"
                  << std::setw(12) << "Semester"
                  << std::setw(10) << "Attendance"
                  << std::setw(12) << "Percentage"
                  << std::setw(8) << "Grade"
                  << "Status\n";
        std::cout << "  ------------------------------------------------------------------------------\n";

        for (size_t i = 0; i < m_studentRepo.count(); ++i) {
            // C++ CONCEPT: Calling Overloaded << Operator
            std::cout << "  " << m_studentRepo.get(i) << "\n";
        }
        std::cout << "  ------------------------------------------------------------------------------\n";
        std::cout << "  Total Registered Students: " << m_studentRepo.count() << "\n";
    }

    // Polymorphism Demo: Base class pointer pointing to Derived objects
    void demonstratePolymorphism() {
        printBanner("OOP CONCEPT DEMO: RUNTIME POLYMORPHISM (Person* pointing to Student & Admin)");

        // C++ CONCEPT: std::unique_ptr (Smart Pointers - Modern Memory Management)
        std::vector<std::unique_ptr<Person>> people;
        people.push_back(std::make_unique<Admin>("admin", "Prof. K. V. S. Ramachandra", "CSE"));
        people.push_back(std::make_unique<Student>("25b11cs001", "Kalyanam Mukundha", "Male", "CSE", "Semester 1", 97.0, 93.2, 91.7, 93.6, 95.8, 91.4));

        for (const auto& personPtr : people) {
            std::cout << "\n>>> Calling personPtr->printDetails() on type: " << personPtr->getRole() << "\n";
            // DYNAMIC DISPATCH: Even though personPtr is Person*, it calls Student or Admin version!
            personPtr->printDetails();
        }
    }

    // Search student by Student ID
    void searchStudent() const {
        printBanner("SEARCH STUDENT RECORD");
        std::cout << "Enter Student Roll Number (e.g. 25b11cs001): ";
        std::string searchId;
        std::cin >> searchId;

        // Convert searchId to lowercase
        std::transform(searchId.begin(), searchId.end(), searchId.begin(), ::tolower);

        bool found = false;
        for (size_t i = 0; i < m_studentRepo.count(); ++i) {
            std::string curId = m_studentRepo.get(i).getStudentId();
            std::transform(curId.begin(), curId.end(), curId.begin(), ::tolower);

            if (curId == searchId) {
                printBanner("STUDENT OFFICIAL ACADEMIC SCORECARD");
                m_studentRepo.get(i).printDetails();
                found = true;
                break;
            }
        }

        if (!found) {
            std::cout << "\n[Notice] No student found with ID: " << searchId << "\n";
        }
    }

    // Add new student (Demonstrates Exception Handling)
    void addNewStudent() {
        printBanner("ADMINISTRATOR: ADD NEW STUDENT RECORD");

        std::string id, name, gender, branch, sem;
        double att, m1, m2, m3, m4, m5;

        std::cout << "Enter Roll Number (e.g. 25b11cs841): ";
        std::cin >> id;

        // Check duplicate
        for (size_t i = 0; i < m_studentRepo.count(); ++i) {
            if (m_studentRepo.get(i).getStudentId() == id) {
                std::cout << "[Error] Student with ID " << id << " already exists!\n";
                return;
            }
        }

        std::cin.ignore();
        std::cout << "Enter Full Name: ";
        std::getline(std::cin, name);

        std::cout << "Enter Gender (Male/Female): ";
        std::cin >> gender;

        std::cout << "Enter Branch (default CSE): ";
        std::cin >> branch;

        std::cin.ignore();
        std::cout << "Enter Semester (e.g. Semester 1): ";
        std::getline(std::cin, sem);

        std::cout << "Enter Attendance Percentage (0 - 100): ";
        std::cin >> att;

        std::cout << "Enter Marks for Mathematics (0 - 100): ";
        std::cin >> m1;
        std::cout << "Enter Marks for Physics (0 - 100): ";
        std::cin >> m2;
        std::cout << "Enter Marks for Python Programming (0 - 100): ";
        std::cin >> m3;
        std::cout << "Enter Marks for Data Structures (0 - 100): ";
        std::cin >> m4;
        std::cout << "Enter Marks for English (0 - 100): ";
        std::cin >> m5;

        // C++ CONCEPT: EXCEPTION HANDLING (TRY - CATCH BLOCK)
        try {
            Student newStudent(id, name, gender, branch, sem, att, m1, m2, m3, m4, m5);
            m_studentRepo.add(newStudent);
            FileStorageManager::saveStudentsToFile(m_dataFile, m_studentRepo);

            std::cout << "\n[Success] Student \"" << name << "\" (" << id << ") successfully registered!\n";
            std::cout << "Auto-Computed Percentage: " << newStudent.getPercentage() << "%\n";
            std::cout << "Auto-Computed Grade: " << newStudent.getGrade() << "\n";
            std::cout << "Auto-Computed Status: " << newStudent.getStatus() << "\n";
        }
        catch (const std::invalid_argument& ex) {
            std::cerr << "\n[Validation Error] " << ex.what() << "\n";
            std::cout << "Student registration failed due to invalid data.\n";
        }
    }

    // Dean's List / Hall of Fame Leaderboard (Demonstrates STL std::sort with custom '<' operator)
    void showDeansList() const {
        printBanner("ADITYA UNIVERSITY - CSE DEAN'S LIST (HALL OF FAME)");

        std::vector<Student> sortedStudents = m_studentRepo.getAll();
        if (sortedStudents.empty()) {
            std::cout << "  No students available.\n";
            return;
        }

        // C++ CONCEPT: STL ALGORITHM std::sort
        // Uses the overloaded operator< in Student to sort descending by percentage
        std::sort(sortedStudents.begin(), sortedStudents.end());

        std::cout << "  Rank  " << std::left << std::setw(14) << "Roll No"
                  << std::setw(24) << "Student Name"
                  << std::setw(14) << "Percentage"
                  << std::setw(8) << "Grade"
                  << "Medal / Distinction\n";
        std::cout << "  ------------------------------------------------------------------------------\n";

        size_t limit = std::min<size_t>(10, sortedStudents.size());
        for (size_t i = 0; i < limit; ++i) {
            std::string medal = "";
            if (i == 0) medal = "[GOLD MEDAL - RANK 1]";
            else if (i == 1) medal = "[SILVER MEDAL - RANK 2]";
            else if (i == 2) medal = "[BRONZE MEDAL - RANK 3]";
            else medal = "Top Ten Honor Roll";

            std::cout << "  #" << std::setw(4) << (i + 1)
                      << std::setw(14) << sortedStudents[i].getStudentId()
                      << std::setw(24) << sortedStudents[i].getName()
                      << std::fixed << std::setprecision(2) << std::setw(14) << (std::to_string(sortedStudents[i].getPercentage()) + "%")
                      << std::setw(8) << sortedStudents[i].getGrade()
                      << medal << "\n";
        }
        std::cout << "  ------------------------------------------------------------------------------\n";
    }

    // Update Attendance (Simulates the live update tested in our test suite)
    void updateAttendance() {
        printBanner("ADMINISTRATOR: UPDATE STUDENT ATTENDANCE");
        std::cout << "Enter Student Roll Number: ";
        std::string id;
        std::cin >> id;

        for (size_t i = 0; i < m_studentRepo.count(); ++i) {
            if (m_studentRepo.get(i).getStudentId() == id) {
                std::cout << "Current Attendance for " << m_studentRepo.get(i).getName()
                          << ": " << m_studentRepo.get(i).getAttendance() << "%\n";
                std::cout << "Enter New Attendance Percentage (e.g. 97.0): ";
                double newAtt;
                std::cin >> newAtt;

                try {
                    double oldAtt = m_studentRepo.get(i).getAttendance();
                    m_studentRepo.get(i).setAttendance(newAtt);
                    FileStorageManager::saveStudentsToFile(m_dataFile, m_studentRepo);
                    std::cout << "\n[Success] Attendance updated from " << oldAtt << "% to " << newAtt << "%!\n";
                } catch (const std::exception& ex) {
                    std::cerr << "[Error] " << ex.what() << "\n";
                }
                return;
            }
        }
        std::cout << "[Notice] Student not found with ID: " << id << "\n";
    }

    // Department Analytics Overview
    void showDepartmentAnalytics() const {
        printBanner("CSE DEPARTMENT ANALYTICS & EXECUTIVE KPI OVERVIEW");

        if (m_studentRepo.count() == 0) {
            std::cout << "  No data available.\n";
            return;
        }

        double totalPct = 0.0;
        double totalAtt = 0.0;
        int passCount = 0;
        int failCount = 0;
        double maxPct = 0.0;
        double minPct = 100.0;

        for (size_t i = 0; i < m_studentRepo.count(); ++i) {
            const auto& s = m_studentRepo.get(i);
            totalPct += s.getPercentage();
            totalAtt += s.getAttendance();
            if (s.getStatus() == "PASS") passCount++;
            else failCount++;

            if (s.getPercentage() > maxPct) maxPct = s.getPercentage();
            if (s.getPercentage() < minPct) minPct = s.getPercentage();
        }

        size_t n = m_studentRepo.count();
        double avgPct = totalPct / n;
        double avgAtt = totalAtt / n;
        double passRate = (static_cast<double>(passCount) / n) * 100.0;

        printField("Total Enrolled Students", n);
        printField("Department Pass Rate", std::to_string(std::round(passRate * 100) / 100) + "%");
        printField("Average Percentage", std::to_string(std::round(avgPct * 100) / 100) + "%");
        printField("Average Attendance", std::to_string(std::round(avgAtt * 100) / 100) + "%");
        printField("Highest Percentage", std::to_string(maxPct) + "%");
        printField("Lowest Percentage", std::to_string(minPct) + "%");
        printField("Pass Count", passCount);
        printField("Remedial / Fail Count", failCount);
    }

    // Main Interactive CLI Menu Loop
    void run() {
        int choice = 0;
        while (choice != 8) {
            printBanner("ADITYA UNIVERSITY - STUDENT MANAGEMENT SYSTEM (AU-SMS)");
            std::cout << "  Logged in as Administrator: " << m_currentAdmin.getName() << "\n";
            std::cout << "  Department: " << m_currentAdmin.getRole() << "\n";
            std::cout << "----------------------------------------------------------------\n";
            std::cout << "  1. View All Enrolled Students (Operator Overloading & Repository)\n";
            std::cout << "  2. Search Student Official Scorecard (Encapsulation)\n";
            std::cout << "  3. Add New Student Record (Validation & Exception Handling)\n";
            std::cout << "  4. Update Student Attendance (Data Mutator)\n";
            std::cout << "  5. View Dean's List / Hall of Fame (STL std::sort & Comparator)\n";
            std::cout << "  6. Department Analytics & KPIs (Statistical Aggregation)\n";
            std::cout << "  7. Demonstrate Polymorphism Demo (Person* -> Student / Admin)\n";
            std::cout << "  8. Save and Exit\n";
            std::cout << "----------------------------------------------------------------\n";
            std::cout << "  Enter your choice (1-8): ";

            if (!(std::cin >> choice)) {
                if (std::cin.eof()) {
                    break;
                }
                std::cin.clear();
                std::string dummy;
                std::cin >> dummy;
                choice = 0;
                continue;
            }

            switch (choice) {
                case 1: displayAllStudents(); break;
                case 2: searchStudent(); break;
                case 3: addNewStudent(); break;
                case 4: updateAttendance(); break;
                case 5: showDeansList(); break;
                case 6: showDepartmentAnalytics(); break;
                case 7: demonstratePolymorphism(); break;
                case 8:
                    FileStorageManager::saveStudentsToFile(m_dataFile, m_studentRepo);
                    std::cout << "\n[AU-SMS] All records safely stored in " << m_dataFile << ". Thank you!\n";
                    break;
                default:
                    std::cout << "\n[!] Invalid selection. Please enter a number from 1 to 8.\n";
            }

            if (choice != 8) {
                std::cout << "\nPress Enter to return to main menu...";
                std::cin.ignore(10000, '\n');
                if (std::cin.eof()) break;
            }
        }
    }
};


// ==============================================================================
// MAIN FUNCTION (PROGRAM ENTRY POINT)
// ==============================================================================
int main() {
    try {
        StudentManagementSystemApp app;
        app.run();
    } catch (const std::exception& ex) {
        std::cerr << "\n[FATAL UNHANDLED EXCEPTION]: " << ex.what() << "\n";
        return 1;
    }
    return 0;
}

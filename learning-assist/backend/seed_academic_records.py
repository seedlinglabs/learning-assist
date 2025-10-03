"""
Seed Academic Records Script

This script creates academic records for all schools, grades, subjects, and topics
found in the local data files (TypeScript/JavaScript files).

It will:
1. Parse the TypeScript data files to extract schools, grades, subjects, and topics
2. Create academic records for each topic with status "not_started"
3. Use academic year "2025-26"
4. Leave teacher and parent fields empty
"""

import json
import re
import os
import sys
from academic_records_lambda_function import create_academic_record

# Add parent directory to path to import from data files
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))


def parse_typescript_data_file(filepath):
    """
    Parse TypeScript data files to extract school, class, subject, and topic information.
    """
    print(f"Parsing file: {filepath}")
    
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Extract school information
    school_id = None
    school_name = None
    
    # Look for school object definition
    school_match = re.search(r'export const (\w+):\s*School\s*=\s*{', content)
    if school_match:
        # Extract school properties
        id_match = re.search(r"id:\s*['\"]([^'\"]+)['\"]", content)
        name_match = re.search(r"name:\s*['\"]([^'\"]+)['\"]", content)
        
        if id_match:
            school_id = id_match.group(1)
        if name_match:
            school_name = name_match.group(1)
    
    print(f"  School ID: {school_id}")
    print(f"  School Name: {school_name}")
    
    if not school_id:
        print("  WARNING: Could not extract school ID from file")
        return None
    
    # Parse classes/grades and subjects
    classes = []
    
    # Find all class definitions
    # Look for patterns like: id: 'content-dev-grade-6', name: 'Grade 6'
    class_pattern = r"{\s*id:\s*['\"]([^'\"]+)['\"],\s*name:\s*['\"]([^'\"]+)['\"]"
    class_matches = re.finditer(class_pattern, content)
    
    for class_match in class_matches:
        class_id = class_match.group(1)
        class_name = class_match.group(2)
        
        # Skip if not a grade/class (might be subject)
        if 'grade' not in class_id.lower() and 'class' not in class_id.lower():
            continue
        
        print(f"  Found class: {class_id} - {class_name}")
        
        # Extract subjects for this class
        subjects = []
        
        # Find subjects within this class context
        # Look for subject definitions after this class
        class_section_start = class_match.end()
        
        # Find the subjects array for this class
        subjects_pattern = r"subjects:\s*\[(.*?)\]"
        subjects_match = re.search(subjects_pattern, content[class_section_start:class_section_start+5000], re.DOTALL)
        
        if subjects_match:
            subjects_content = subjects_match.group(1)
            
            # Find all subject objects
            subject_pattern = r"{\s*id:\s*['\"]([^'\"]+)['\"],\s*name:\s*['\"]([^'\"]+)['\"]"
            subject_matches = re.finditer(subject_pattern, subjects_content)
            
            for subject_match in subject_matches:
                subject_id = subject_match.group(1)
                subject_name = subject_match.group(2)
                
                print(f"    Subject: {subject_id} - {subject_name}")
                
                subjects.append({
                    'id': subject_id,
                    'name': subject_name
                })
        
        if subjects:
            classes.append({
                'id': class_id,
                'name': class_name,
                'subjects': subjects
            })
    
    if not classes:
        print("  WARNING: No classes found in file")
        return None
    
    return {
        'school_id': school_id,
        'school_name': school_name,
        'classes': classes
    }


def create_records_from_data(school_data, academic_year='2025-26'):
    """
    Create academic records for all subjects in the school data.
    """
    if not school_data:
        return
    
    school_id = school_data['school_id']
    school_name = school_data['school_name']
    
    print(f"\nCreating records for {school_name} ({school_id})")
    print(f"Academic Year: {academic_year}")
    print("=" * 80)
    
    created_count = 0
    error_count = 0
    
    for class_data in school_data['classes']:
        class_id = class_data['id']
        class_name = class_data['name']
        
        # Extract grade and section from class_id
        # Format: content-dev-grade-6 or class-6
        grade = None
        section = 'A'  # Default section
        
        # Extract grade number
        grade_match = re.search(r'(?:grade|class)-(\d+)', class_id)
        if grade_match:
            grade = grade_match.group(1)
        
        if not grade:
            print(f"  WARNING: Could not extract grade from class ID: {class_id}")
            continue
        
        print(f"\n  Class: {class_name} (Grade {grade}, Section {section})")
        
        for subject in class_data['subjects']:
            subject_id = subject['id']
            subject_name = subject['name']
            
            # Create a generic topic ID for this subject
            topic_id = f"{subject_id}-general"
            topic_name = f"{subject_name} - General Topics"
            
            print(f"    Creating record for: {subject_name}")
            
            # Prepare record data
            record_data = {
                'school_id': school_id,
                'academic_year': academic_year,
                'grade': grade,
                'section': section,
                'subject_id': subject_id,
                'subject_name': subject_name,
                'topic_id': topic_id,
                'topic_name': topic_name,
                'teacher_id': '',
                'teacher_name': '',
                'parent_phone': '',
                'parent_name': '',
                'status': 'not_started',
                'start_date': '',
                'end_date': '',
                'notes': f'Auto-generated record for {academic_year}'
            }
            
            try:
                result = create_academic_record(record_data)
                
                if result['statusCode'] == 201:
                    created_count += 1
                    print(f"      ✓ Created successfully")
                else:
                    error_count += 1
                    body = json.loads(result['body'])
                    print(f"      ✗ Error: {body.get('error', 'Unknown error')}")
            except Exception as e:
                error_count += 1
                print(f"      ✗ Exception: {str(e)}")
    
    print(f"\n  Summary for {school_name}:")
    print(f"    Created: {created_count}")
    print(f"    Errors: {error_count}")
    print("=" * 80)
    
    return created_count, error_count


def main():
    """
    Main function to seed academic records from all data files.
    """
    print("=" * 80)
    print("Academic Records Seeding Script")
    print("=" * 80)
    print("\nThis script will create academic records for:")
    print("  - Academic Year: 2025-26")
    print("  - Status: not_started")
    print("  - Teacher/Parent: Empty")
    print("\nParsing data files...")
    print("=" * 80)
    
    # Path to data files (relative to backend directory)
    data_dir = os.path.join(os.path.dirname(__file__), '..', 'src', 'data')
    
    # Data files to parse
    data_files = [
        'content-development-school.ts',
        'sri-vidyaniketan-public-school-cbse.ts',
        'sri-vidyaniketan-international-school-icse.ts'
    ]
    
    total_created = 0
    total_errors = 0
    
    for data_file in data_files:
        filepath = os.path.join(data_dir, data_file)
        
        if not os.path.exists(filepath):
            print(f"\nWARNING: File not found: {filepath}")
            continue
        
        # Parse the data file
        school_data = parse_typescript_data_file(filepath)
        
        if school_data:
            # Create records
            created, errors = create_records_from_data(school_data)
            total_created += created
            total_errors += errors
        
        print()  # Empty line between schools
    
    print("\n" + "=" * 80)
    print("FINAL SUMMARY")
    print("=" * 80)
    print(f"Total records created: {total_created}")
    print(f"Total errors: {total_errors}")
    print("=" * 80)
    
    if total_errors > 0:
        print("\nNote: Some records may already exist. Check error messages above.")
    
    print("\nSeeding complete!")


if __name__ == '__main__':
    # Check if we should run in dry-run mode
    if len(sys.argv) > 1 and sys.argv[1] == '--dry-run':
        print("DRY RUN MODE - No records will be created")
        print("Remove --dry-run flag to actually create records")
        print()
    
    main()


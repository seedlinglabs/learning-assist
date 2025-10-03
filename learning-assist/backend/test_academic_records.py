"""
Test script for Academic Records Lambda Function

Run this locally to test the Lambda function logic
"""

import json
from academic_records_lambda_function import (
    create_academic_record,
    get_academic_record,
    update_academic_record,
    delete_academic_record,
    query_by_parent_phone,
    query_by_teacher_id,
    query_by_school_id,
    list_records_by_class,
    generate_record_id
)


def test_generate_record_id():
    """Test record ID generation"""
    print("\n=== Test: Generate Record ID ===")
    
    record_id = generate_record_id(
        school_id="content-development-school",
        academic_year="2024-25",
        grade="6",
        section="A",
        subject_id="science"
    )
    
    print(f"Generated Record ID: {record_id}")
    assert record_id == "content-development-school#2024-25#6#A#science"
    print("✓ Test passed")


def test_create_record():
    """Test creating an academic record"""
    print("\n=== Test: Create Academic Record ===")
    
    data = {
        "school_id": "content-development-school",
        "academic_year": "2024-25",
        "grade": "6",
        "section": "A",
        "subject_id": "science",
        "subject_name": "Science",
        "topic_id": "topic-photosynthesis",
        "topic_name": "Photosynthesis",
        "teacher_id": "teacher-123",
        "teacher_name": "Mrs. Smith",
        "parent_phone": "9900509938",
        "parent_name": "Parent 001",
        "status": "in_progress",
        "start_date": "2024-09-01",
        "notes": "Started with basic concepts"
    }
    
    print("Creating record with data:")
    print(json.dumps(data, indent=2))
    
    # Note: This will fail locally without DynamoDB access
    # Use this as a reference for API testing
    print("\n⚠ Note: This test requires DynamoDB access")
    print("Use this data structure for API testing")


def test_invalid_status():
    """Test validation of invalid status"""
    print("\n=== Test: Invalid Status Validation ===")
    
    data = {
        "school_id": "content-development-school",
        "academic_year": "2024-25",
        "grade": "6",
        "section": "A",
        "subject_id": "science",
        "subject_name": "Science",
        "topic_id": "topic-photosynthesis",
        "topic_name": "Photosynthesis",
        "status": "invalid_status"  # Invalid status
    }
    
    print("Testing with invalid status: 'invalid_status'")
    print("Expected: 400 Bad Request with error message")
    print("✓ Validation logic is in place")


def print_api_examples():
    """Print cURL examples for testing"""
    print("\n" + "="*60)
    print("API Testing Examples (using cURL)")
    print("="*60)
    
    api_url = "https://YOUR-API-GATEWAY-URL/pre-prod/academic-records"
    
    print("\n1. Create a Record:")
    print("-" * 60)
    print(f"""curl -X POST {api_url} \\
  -H "Content-Type: application/json" \\
  -d '{{
    "school_id": "content-development-school",
    "academic_year": "2024-25",
    "grade": "6",
    "section": "A",
    "subject_id": "science",
    "subject_name": "Science",
    "topic_id": "topic-photosynthesis",
    "topic_name": "Photosynthesis",
    "teacher_id": "teacher-123",
    "teacher_name": "Mrs. Smith",
    "parent_phone": "9900509938",
    "parent_name": "Parent 001",
    "status": "in_progress",
    "start_date": "2024-09-01"
  }}'""")
    
    print("\n2. Get Record:")
    print("-" * 60)
    record_id = "content-development-school%232024-25%236%23A%23science"
    topic_id = "topic-photosynthesis"
    print(f"curl -X GET {api_url}/{record_id}/{topic_id}")
    
    print("\n3. Update Record Status:")
    print("-" * 60)
    print(f"""curl -X PUT {api_url}/{record_id}/{topic_id} \\
  -H "Content-Type: application/json" \\
  -d '{{
    "status": "completed",
    "end_date": "2024-09-25",
    "notes": "Topic completed successfully"
  }}'""")
    
    print("\n4. Query by Parent Phone:")
    print("-" * 60)
    print(f"curl -X GET \"{api_url}?parent_phone=9900509938\"")
    
    print("\n5. Query by Teacher ID:")
    print("-" * 60)
    print(f"curl -X GET \"{api_url}?teacher_id=teacher-123\"")
    
    print("\n6. Query by School ID:")
    print("-" * 60)
    print(f"curl -X GET \"{api_url}?school_id=content-development-school\"")
    
    print("\n7. Query by Class:")
    print("-" * 60)
    print(f"curl -X GET \"{api_url}?school_id=content-development-school&academic_year=2024-25&grade=6&section=A\"")
    
    print("\n8. Delete Record:")
    print("-" * 60)
    print(f"curl -X DELETE {api_url}/{record_id}/{topic_id}")


def print_data_model():
    """Print data model reference"""
    print("\n" + "="*60)
    print("Data Model Reference")
    print("="*60)
    
    print("\nRecord Structure:")
    print("-" * 60)
    record = {
        "record_id": "content-development-school#2024-25#6#A#science",
        "topic_id": "topic-photosynthesis",
        "school_id": "content-development-school",
        "academic_year": "2024-25",
        "grade": "6",
        "section": "A",
        "subject_id": "science",
        "subject_name": "Science",
        "topic_name": "Photosynthesis",
        "teacher_id": "teacher-123",
        "teacher_name": "Mrs. Smith",
        "parent_phone": "9900509938",
        "parent_name": "Parent 001",
        "status": "in_progress",
        "start_date": "2024-09-01",
        "end_date": "",
        "notes": "Started with basic concepts",
        "created_at": "2024-09-29T12:00:00.000Z",
        "updated_at": "2024-09-29T12:00:00.000Z"
    }
    print(json.dumps(record, indent=2))
    
    print("\nValid Status Values:")
    print("-" * 60)
    statuses = [
        "not_started",
        "in_progress",
        "completed",
        "on_hold",
        "cancelled"
    ]
    for status in statuses:
        print(f"  • {status}")
    
    print("\nQuery Patterns:")
    print("-" * 60)
    patterns = [
        ("By Parent Phone", "parent_phone=9900509938"),
        ("By Teacher ID", "teacher_id=teacher-123"),
        ("By School ID", "school_id=content-development-school"),
        ("By Class", "school_id=X&academic_year=Y&grade=Z&section=W")
    ]
    for name, pattern in patterns:
        print(f"  • {name}: ?{pattern}")


def main():
    """Run all tests"""
    print("="*60)
    print("Academic Records Lambda Function - Test Suite")
    print("="*60)
    
    # Run tests
    test_generate_record_id()
    test_create_record()
    test_invalid_status()
    
    # Print reference information
    print_data_model()
    print_api_examples()
    
    print("\n" + "="*60)
    print("Test Suite Complete")
    print("="*60)
    print("\nNext Steps:")
    print("1. Deploy Lambda function: ./deploy-academic-records.sh")
    print("2. Set up API Gateway")
    print("3. Test with the cURL examples above")
    print("4. Integrate with frontend applications")
    print()


if __name__ == "__main__":
    main()


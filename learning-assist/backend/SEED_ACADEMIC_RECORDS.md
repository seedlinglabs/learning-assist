# Seed Academic Records Script

This script automatically creates academic records for all schools, grades, and subjects defined in your local data files.

## What It Does

The script will:
1. **Parse TypeScript data files** from `src/data/`
2. **Extract school, grade, and subject information**
3. **Create academic records** for each subject with:
   - **Academic Year**: `2025-26`
   - **Status**: `not_started`
   - **Teacher**: Empty (to be assigned later)
   - **Parent**: Empty (to be assigned later)
   - **Topic**: Generic topic for each subject

## Prerequisites

1. **Lambda function deployed**: `academic-records-service`
2. **DynamoDB table**: `academic_records` (auto-created by Lambda)
3. **AWS credentials configured** (for local testing)
4. **Python 3.9+** installed

## Data Files Processed

The script processes these TypeScript data files:
- `src/data/content-development-school.ts`
- `src/data/sri-vidyaniketan-public-school-cbse.ts`
- `src/data/sri-vidyaniketan-international-school-icse.ts`

## Usage

### Dry Run (Preview Only)

To see what records would be created without actually creating them:

```bash
cd learning-assist/backend
python3 seed_academic_records.py --dry-run
```

### Create Records

To actually create the records in DynamoDB:

```bash
cd learning-assist/backend
python3 seed_academic_records.py
```

## Expected Output

```
================================================================================
Academic Records Seeding Script
================================================================================

This script will create academic records for:
  - Academic Year: 2025-26
  - Status: not_started
  - Teacher/Parent: Empty

Parsing data files...
================================================================================
Parsing file: ../src/data/content-development-school.ts
  School ID: content-development-school
  School Name: Content Development
  Found class: content-dev-grade-6 - Grade 6
    Subject: content-dev-grade-6-science - Science
    Subject: content-dev-grade-6-mathematics - Mathematics
    Subject: content-dev-grade-6-english - English
  ...

Creating records for Content Development (content-development-school)
Academic Year: 2025-26
================================================================================

  Class: Grade 6 (Grade 6, Section A)
    Creating record for: Science
      ✓ Created successfully
    Creating record for: Mathematics
      ✓ Created successfully
    Creating record for: English
      ✓ Created successfully
  ...

  Summary for Content Development:
    Created: 25
    Errors: 0
================================================================================

================================================================================
FINAL SUMMARY
================================================================================
Total records created: 150
Total errors: 0
================================================================================

Seeding complete!
```

## Record Structure

Each record created will have:

```json
{
  "school_id": "content-development-school",
  "academic_year": "2025-26",
  "grade": "6",
  "section": "A",
  "subject_id": "content-dev-grade-6-science",
  "subject_name": "Science",
  "topic_id": "content-dev-grade-6-science-general",
  "topic_name": "Science - General Topics",
  "teacher_id": "",
  "teacher_name": "",
  "parent_phone": "",
  "parent_name": "",
  "status": "not_started",
  "notes": "Auto-generated record for 2025-26"
}
```

## Customize the Script

### Change Academic Year

Edit the script and modify:
```python
def main():
    # ...
    created, errors = create_records_from_data(school_data, academic_year='2026-27')
```

### Change Default Section

Edit the script and modify:
```python
section = 'A'  # Change to 'B', 'C', etc.
```

### Change Default Status

Edit the script and modify:
```python
'status': 'not_started',  # Change to 'in_progress', etc.
```

## Troubleshooting

### Issue: ModuleNotFoundError

**Error**: `ModuleNotFoundError: No module named 'academic_records_lambda_function'`

**Solution**: Make sure you're in the `backend` directory:
```bash
cd learning-assist/backend
python3 seed_academic_records.py
```

### Issue: AWS Credentials Not Found

**Error**: `Unable to locate credentials`

**Solution**: Configure AWS credentials:
```bash
aws configure
```

Or set environment variables:
```bash
export AWS_ACCESS_KEY_ID=your_key_id
export AWS_SECRET_ACCESS_KEY=your_secret_key
export AWS_DEFAULT_REGION=us-west-2
```

### Issue: Permission Denied

**Error**: `An error occurred (AccessDeniedException) when calling the PutItem operation`

**Solution**: Ensure your AWS credentials have DynamoDB permissions.

### Issue: Duplicate Records

**Error**: Records already exist

**Solution**: The script will report errors for duplicate records. This is normal if you run the script multiple times. Existing records are not overwritten.

## Verify Records

### Option 1: AWS Console

1. Go to **DynamoDB** console
2. Select table: `academic_records`
3. Click **"Explore table items"**
4. View the created records

### Option 2: API Gateway Test

```bash
curl -X GET "https://a34mmmc1te.execute-api.us-west-2.amazonaws.com/pre-prod/academic-records?school_id=content-development-school&academic_year=2025-26&grade=6&section=A" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Option 3: Admin Panel

1. Login with admin user
2. Go to **Admin** → **Academic Records**
3. Filter by:
   - Academic Year: `2025-26`
   - Grade: `6`
   - Section: `A`
   - Status: `not_started`

## After Seeding

Once records are seeded, you can:

1. **Assign Teachers**: Update records with teacher information
2. **Assign Parents**: Update records with parent phone numbers
3. **Update Status**: Change status as topics progress
4. **Set Dates**: Add start/end dates for planning

### Bulk Update Example

To assign a teacher to all Grade 6 Science records:

```python
# Update script example
from academic_records_lambda_function import update_academic_record

record_id = "content-development-school#2025-26#6#A#science"
topic_id = "content-dev-grade-6-science-general"

update_data = {
    'teacher_id': 'teacher-123',
    'teacher_name': 'Mrs. Smith',
    'status': 'in_progress',
    'start_date': '2025-04-01'
}

result = update_academic_record(record_id, topic_id, update_data)
```

## Clean Up

To delete all seeded records (if needed):

```bash
# WARNING: This will delete all records for 2025-26
aws dynamodb scan \
  --table-name academic_records \
  --filter-expression "academic_year = :year" \
  --expression-attribute-values '{":year":{"S":"2025-26"}}' \
  --region us-west-2
```

## Integration

These seeded records will be visible in:

1. **Admin Panel**: For management and assignment
2. **Parent App**: Once parents are assigned
3. **Teacher Dashboard**: Once teachers are assigned (future feature)

## Next Steps

After seeding:

1. ✅ Verify records in DynamoDB
2. ✅ Test queries in Admin Panel
3. ✅ Assign teachers to subjects
4. ✅ Assign parents to students
5. ✅ Update status as topics begin
6. ✅ Track progress throughout the year

## Support

For issues or questions:
- Check Lambda logs in CloudWatch
- Verify DynamoDB table permissions
- Ensure API Gateway is properly configured
- Review error messages in script output


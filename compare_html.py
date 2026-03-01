
import sys
import re

def extract_ids(filename):
    with open(filename, 'r', encoding='utf-8') as f:
        content = f.read()
    # Find all id="..."
    ids = re.findall(r'id=["\']([^"\']+)["\']', content)
    return set(ids)

def compare(file1, file2):
    ids1 = extract_ids(file1)
    ids2 = extract_ids(file2)
    
    missing_in_1 = ids2 - ids1
    missing_in_2 = ids1 - ids2
    
    print(f"IDs missing in {file1}:")
    for i in sorted(missing_in_1):
        print(f"  - {i}")
        
    print(f"\nIDs missing in {file2}:")
    for i in sorted(missing_in_2):
        print(f"  - {i}")

if __name__ == "__main__":
    compare(sys.argv[1], sys.argv[2])

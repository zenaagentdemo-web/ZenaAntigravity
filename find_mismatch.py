import re

def find_mismatch(filename):
    with open(filename, 'r') as f:
        content = f.read()
    
    # Simple regex for tags, ignoring attributes
    tags = re.findall(r'<(div|section|header|footer|button|span|h1|h2|h3|p|Avatar|AmbientBackground|BatchActionBar|ZenaBatchComposeModal|NewContactModal|ZenaCallTooltip|IntelScoreTooltip|Shield|Mail|Phone|Briefcase|Hammer|ArrowRight|LayoutGrid|List|Plus|X|Send|Sparkles|CheckSquare|DollarSign|RefreshCw|Users|Search|UserCircle)|</(div|section|header|footer|button|span|h1|h2|h3|p|Avatar|AmbientBackground|BatchActionBar|ZenaBatchComposeModal|NewContactModal|ZenaCallTooltip|IntelScoreTooltip|Shield|Mail|Phone|Briefcase|Hammer|ArrowRight|LayoutGrid|List|Plus|X|Send|Sparkles|CheckSquare|DollarSign|RefreshCw|Users|Search|UserCircle)', content)
    
    stack = []
    lines = content.split('\n')
    for i, line in enumerate(lines):
        line_tags = re.findall(r'<(div|section|header|footer|button|span|h1|h2|h3|p|Avatar|AmbientBackground|BatchActionBar|ZenaBatchComposeModal|NewContactModal|ZenaCallTooltip|IntelScoreTooltip|Shield|Mail|Phone|Briefcase|Hammer|ArrowRight|LayoutGrid|List|Plus|X|Send|Sparkles|CheckSquare|DollarSign|RefreshCw|Users|Search|UserCircle)(\s*/>)|<(div|section|header|footer|button|span|h1|h2|h3|p|Avatar|AmbientBackground|BatchActionBar|ZenaBatchComposeModal|NewContactModal|ZenaCallTooltip|IntelScoreTooltip|Shield|Mail|Phone|Briefcase|Hammer|ArrowRight|LayoutGrid|List|Plus|X|Send|Sparkles|CheckSquare|DollarSign|RefreshCw|Users|Search|UserCircle)|</(div|section|header|footer|button|span|h1|h2|h3|p|Avatar|AmbientBackground|BatchActionBar|ZenaBatchComposeModal|NewContactModal|ZenaCallTooltip|IntelScoreTooltip|Shield|Mail|Phone|Briefcase|Hammer|ArrowRight|LayoutGrid|List|Plus|X|Send|Sparkles|CheckSquare|DollarSign|RefreshCw|Users|Search|UserCircle)', line)
        for t in line_tags:
            if t[1] == '/>': # Self-closing
                continue
            if t[2]: # Opening tag
                stack.append((t[2], i + 1))
            elif t[3]: # Closing tag
                if not stack:
                    print(f"Unexpected closing tag </{t[3]}> at line {i+1}")
                    return
                top, line_num = stack.pop()
                if top != t[3]:
                    print(f"Mismatch: <{top}> from line {line_num} closed by </{t[3]}> at line {i+1}")
                    # return

    if stack:
        print("Unclosed tags:")
        for t, line_num in stack:
            print(f"<{t}> at line {line_num}")

find_mismatch('packages/frontend/src/pages/ContactsPage/ContactsPage.tsx')

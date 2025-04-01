import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Bold, Italic, Link, List, ListOrdered, Image, Smile } from "lucide-react";

interface PostEditorProps {
  value: string;
  onChange: (value: string) => void;
}

const PostEditor = ({ value, onChange }: PostEditorProps) => {
  const [isFocused, setIsFocused] = useState(false);
  
  const insertFormatting = (prefix: string, suffix: string = prefix) => {
    const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
    if (!textarea) return;
    
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);
    
    const newText = value.substring(0, start) + 
                  prefix + selectedText + suffix + 
                  value.substring(end);
    
    onChange(newText);
    
    // Focus back on textarea and set selection
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(
        start + prefix.length, 
        start + prefix.length + selectedText.length
      );
    }, 0);
  };
  
  const handleToolbarAction = (action: string) => {
    switch (action) {
      case 'bold':
        insertFormatting('**');
        break;
      case 'italic':
        insertFormatting('*');
        break;
      case 'link':
        insertFormatting('[', '](url)');
        break;
      case 'list':
        insertFormatting('- ');
        break;
      case 'orderedList':
        insertFormatting('1. ');
        break;
      case 'emoji':
        insertFormatting(':) ');
        break;
      default:
        break;
    }
  };
  
  return (
    <div className="rounded-md border border-gray-200 overflow-hidden">
      {isFocused && (
        <div className="p-2 border-b border-gray-200 flex space-x-1 bg-gray-50">
          <Button 
            type="button" 
            variant="ghost" 
            size="sm" 
            className="h-8 px-2" 
            onClick={() => handleToolbarAction('bold')}
          >
            <Bold className="h-4 w-4" />
          </Button>
          <Button 
            type="button" 
            variant="ghost" 
            size="sm" 
            className="h-8 px-2" 
            onClick={() => handleToolbarAction('italic')}
          >
            <Italic className="h-4 w-4" />
          </Button>
          <Button 
            type="button" 
            variant="ghost" 
            size="sm" 
            className="h-8 px-2" 
            onClick={() => handleToolbarAction('link')}
          >
            <Link className="h-4 w-4" />
          </Button>
          <Button 
            type="button" 
            variant="ghost" 
            size="sm" 
            className="h-8 px-2" 
            onClick={() => handleToolbarAction('list')}
          >
            <List className="h-4 w-4" />
          </Button>
          <Button 
            type="button" 
            variant="ghost" 
            size="sm" 
            className="h-8 px-2" 
            onClick={() => handleToolbarAction('orderedList')}
          >
            <ListOrdered className="h-4 w-4" />
          </Button>
          <Button 
            type="button" 
            variant="ghost" 
            size="sm" 
            className="h-8 px-2" 
            onClick={() => handleToolbarAction('emoji')}
          >
            <Smile className="h-4 w-4" />
          </Button>
        </div>
      )}
      
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        placeholder="What would you like to share?"
        className="border-0 focus-visible:ring-0 resize-none min-h-[120px]"
      />
    </div>
  );
};

export default PostEditor;

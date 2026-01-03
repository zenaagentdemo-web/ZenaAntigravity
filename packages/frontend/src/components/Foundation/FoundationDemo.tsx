import React from 'react';
import { Button, Card, Input, Typography, Container, Flex, Grid } from './index';

/**
 * Demo component showcasing the Foundation design system components
 * This demonstrates the comprehensive design token system and base component architecture
 */
export const FoundationDemo: React.FC = () => {
  return (
    <Container maxWidth="lg" padding="lg">
      <Flex direction="column" gap="xl">
        {/* Typography Demo */}
        <Card variant="elevated" padding="lg">
          <Typography variant="h2" color="primary" className="mb-4">
            Professional Design System Foundation
          </Typography>
          <Typography variant="body1" color="secondary" className="mb-6">
            This demo showcases our comprehensive design token system with professional
            color palette, typography, and spacing that creates a sophisticated,
            modern interface suitable for business applications.
          </Typography>

          <Grid cols={3} gap="md" responsive>
            <div>
              <Typography variant="h6" color="primary">Headings</Typography>
              <Typography variant="h1">H1 Title</Typography>
              <Typography variant="h3">H3 Subtitle</Typography>
              <Typography variant="h5">H5 Section</Typography>
            </div>
            <div>
              <Typography variant="h6" color="primary">Body Text</Typography>
              <Typography variant="body1">Body 1 - Primary text content</Typography>
              <Typography variant="body2" color="secondary">Body 2 - Secondary text</Typography>
              <Typography variant="caption" color="muted">Caption text</Typography>
            </div>
            <div>
              <Typography variant="h6" color="primary">Semantic Colours</Typography>
              <Typography variant="body2" color="success">Success message</Typography>
              <Typography variant="body2" color="warning">Warning message</Typography>
              <Typography variant="body2" color="error">Error message</Typography>
            </div>
          </Grid>
        </Card>

        {/* Button Demo */}
        <Card variant="outlined" padding="lg">
          <Typography variant="h4" color="primary" className="mb-4">
            Button Components
          </Typography>
          <Flex wrap="wrap" gap="md">
            <Button variant="primary" size="lg">Primary Large</Button>
            <Button variant="secondary" size="md">Secondary Medium</Button>
            <Button variant="outline" size="sm">Outline Small</Button>
            <Button variant="ghost">Ghost Button</Button>
            <Button variant="danger">Danger Button</Button>
            <Button variant="primary" disabled>Disabled</Button>
          </Flex>
        </Card>

        {/* Input Demo */}
        <Card variant="filled" padding="lg">
          <Typography variant="h4" color="primary" className="mb-4">
            Input Components
          </Typography>
          <Grid cols={2} gap="lg" responsive>
            <Input
              label="Default Input"
              placeholder="Enter text here..."
              size="md"
            />
            <Input
              label="Required Field"
              placeholder="This field is required"
              required
              variant="outlined"
            />
            <Input
              label="Error State"
              placeholder="Invalid input"
              error
              helperText="This field has an error"
            />
            <Input
              label="Success State"
              placeholder="Valid input"
              helperText="This looks good!"
            />
          </Grid>
        </Card>

        {/* Layout Demo */}
        <Card variant="default" padding="lg">
          <Typography variant="h4" color="primary" className="mb-4">
            Layout Components
          </Typography>
          <Typography variant="body2" color="secondary" className="mb-4">
            Responsive grid system with professional spacing
          </Typography>

          <Grid cols={4} gap="md" responsive>
            {Array.from({ length: 8 }, (_, i) => (
              <Card key={i} variant="elevated" padding="md">
                <Typography variant="body2" align="center">
                  Grid Item {i + 1}
                </Typography>
              </Card>
            ))}
          </Grid>
        </Card>

        {/* Design Tokens Demo */}
        <Card variant="outlined" padding="lg">
          <Typography variant="h4" color="primary" className="mb-4">
            Design Token System
          </Typography>
          <Typography variant="body2" color="secondary" className="mb-4">
            All components use CSS custom properties for maintainable theming
          </Typography>

          <Flex direction="column" gap="md">
            <div style={{
              padding: 'var(--spacing-4)',
              backgroundColor: 'var(--color-primary-50)',
              border: '1px solid var(--color-primary-200)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--color-primary-700)'
            }}>
              <Typography variant="body2">
                This uses design tokens: --color-primary-50, --spacing-4, --radius-md
              </Typography>
            </div>

            <div style={{
              padding: 'var(--spacing-6)',
              backgroundColor: 'var(--color-success-50)',
              border: '1px solid var(--color-success-200)',
              borderRadius: 'var(--radius-lg)',
              boxShadow: 'var(--shadow-md)'
            }}>
              <Typography variant="body2" color="success">
                Professional elevation system with semantic colors
              </Typography>
            </div>
          </Flex>
        </Card>
      </Flex>
    </Container>
  );
};
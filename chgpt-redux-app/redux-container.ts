import React, { useEffect } from 'react';
import { connect, ConnectedProps } from 'react-redux';
import { RootState } from '../redux-org-sample/app/store';
import { fetchPosts, Post } from './actions';

// Props type for the component
type Props = ConnectedProps<typeof connector>;

// Component
const PostList: React.FC<Props> = ({ posts, fetchPosts }) => {
  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  return (
    <div>
      {posts.map((post: Post) => (
        <div key={post.id}>{post.title}</div>
      ))}
    </div>
  );
};

// Map state from Redux store to component props
const mapStateToProps = (state: RootState) => ({
  posts: state.posts,
});

// Map dispatch actions to component props
const mapDispatchToProps = {
  fetchPosts,
};

// Connect component to Redux store
const connector = connect(mapStateToProps, mapDispatchToProps);

// Export the connected component
export default connector(PostList);

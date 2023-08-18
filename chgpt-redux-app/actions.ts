import { Action } from 'redux';

// Action types
export enum PostActionTypes {
  FETCH_POSTS = 'FETCH_POSTS',
  ADD_POST = 'ADD_POST',
}

// Post interface
export interface Post {
  id: number;
  title: string;
  content: string;
}

// Action interfaces
export interface FetchPostsAction extends Action {
  type: PostActionTypes.FETCH_POSTS;
  payload: Post[];
}

export interface AddPostAction extends Action {
  type: PostActionTypes.ADD_POST;
  payload: Post;
}

// Action creators
export const fetchPosts = (): FetchPostsAction => ({
  type: PostActionTypes.FETCH_POSTS,
  payload: [
    { id: 1, title: 'Post 1', content: 'Lorem ipsum dolor sit amet.' },
    { id: 2, title: 'Post 2', content: 'Lorem ipsum dolor sit amet.' },
  ],
});

export const addPost = (post: Post): AddPostAction => ({
  type: PostActionTypes.ADD_POST,
  payload: post,
});
